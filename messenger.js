'use strict'

/** ******* Imports ********/
const { subtle } = require('node:crypto').webcrypto

const {
  bufferToString,
  genRandomSalt,
  generateEG,
  computeDH,
  verifyWithECDSA,
  HMACtoAESKey,
  HMACtoHMACKey,
  HKDF,
  encryptWithGCM,
  decryptWithGCM
} = require('./lib')

/** ******* Implementation ********/

class MessengerClient {
  constructor (certAuthorityPublicKey, govPublicKey) {
    this.caPublicKey = certAuthorityPublicKey
    this.govPublicKey = govPublicKey
    this.conns = {} // data for each active connection
    this.certs = {} // certificates of other users
    this.EGKeyPair = {} // keypair from generateCertificate
  }

  async generateCertificate (username) {
    const certificate = {}
    certificate.username = username

    // Generate ElGamal key pair
    const keyPair = await generateEG()
    certificate.pub_key = keyPair.pub

    // Store the key pair correctly
    this.EGKeyPair = { pub: keyPair.pub, sec: keyPair.sec } // Store as long-term key pair

    return certificate
  }

  async receiveCertificate (certificate, signature) {
    const valid = await verifyWithECDSA(this.caPublicKey, JSON.stringify(certificate), signature)
    if (!valid) throw new Error('invalid signature provided')
    this.certs[certificate.username] = certificate
  }

  async sendMessage (name, plaintext) {
    if (!(name in this.conns)) {
      const bobPublicKey = this.certs[name]?.pub_key
      if (!bobPublicKey) {
        throw new Error(`Missing certificate for user ${name}`)
      }

      const rawRootKey = await computeDH(this.EGKeyPair.sec, bobPublicKey)
      const freshPair = await generateEG()
      this.myKeyPairs = { ...this.myKeyPairs, [name]: { pub_key: freshPair.pub, sec_key: freshPair.sec } }

      const hkdfInputKey = await computeDH(this.myKeyPairs[name].sec_key, bobPublicKey)
      const [rootKey, chainKey] = await HKDF(hkdfInputKey, rawRootKey, 'ratchet-salt')
      this.conns[name] = { rk: rootKey, ckS: chainKey }
      this.conns[name].seenPks = new Set()
    }

    const ckS = await HMACtoHMACKey(this.conns[name].ckS, 'ck-str')
    const mk = await HMACtoAESKey(this.conns[name].ckS, 'mk-str')
    const mkBuffer = await HMACtoAESKey(this.conns[name].ckS, 'mk-str', true)
    this.conns[name].ckS = ckS

    const ivGov = genRandomSalt()
    const receiverIv = genRandomSalt()
    const newGovPair = await generateEG()

    const dhSecret = await computeDH(newGovPair.sec, this.govPublicKey)
    const dhSecretKey = await HMACtoAESKey(dhSecret, 'AES-generation')
    const cGov = await encryptWithGCM(dhSecretKey, mkBuffer, ivGov)

    // Export the public key correctly for the header
    const header = {
      vGov: await subtle.exportKey('jwk', newGovPair.pub),
      cGov,
      receiverIv,
      ivGov,
      pkSender: await subtle.exportKey('jwk', this.myKeyPairs[name].pub_key)
    }

    const ciphertext = await encryptWithGCM(mk, plaintext, receiverIv, JSON.stringify(header))
    return [header, ciphertext]
  }

  async receiveMessage (name, [header, ciphertext]) {
    if (!(name in this.conns)) {
      const peerPublicKey = await subtle.importKey(
        'jwk',
        header.vGov,
        { name: 'ECDH', namedCurve: 'P-384' },
        true,
        ['deriveKey'] // Only deriveKey for ECDH
      )

      // Check if the private key is properly initialized
      if (!this.EGKeyPair.sec) {
        throw new Error('Private key is missing or invalid.')
      }

      // Perform Diffie-Hellman to derive a shared secret with the correct key usage permissions
      const sharedSecret = await computeDH(this.EGKeyPair.sec, peerPublicKey)
      const rootKey = await HMACtoAESKey(sharedSecret, 'RootKey') // Root key with "sign" usage
      this.conns[name] = {
        ckR: rootKey, // Chain key with signing permissions
        lastReceived: 0,
        outOfOrderMessages: {}
      }
    }

    const conn = this.conns[name]
    const { sequenceNumber } = header

    // Handle out-of-order messages
    if (sequenceNumber > conn.lastReceived + 1) {
      conn.outOfOrderMessages[sequenceNumber] = [header, ciphertext]
      return null
    }

    // Derive message key with "sign" permission from the chain key
    const mk = await HMACtoAESKey(conn.ckR, 'mk-str')
    const plaintextBuffer = await decryptWithGCM(mk, ciphertext, header.receiverIv, JSON.stringify(header))
    conn.lastReceived = sequenceNumber

    // Process any out-of-order messages
    while (conn.outOfOrderMessages[conn.lastReceived + 1]) {
      const [nextHeader, nextCiphertext] = conn.outOfOrderMessages[conn.lastReceived + 1]
      delete conn.outOfOrderMessages[conn.lastReceived + 1]

      const nextMk = await HMACtoAESKey(conn.ckR, 'mk-str')
      const nextPlaintextBuffer = await decryptWithGCM(nextMk, nextCiphertext, nextHeader.receiverIv, JSON.stringify(nextHeader))

      conn.lastReceived += 1
      console.log(`Processed out-of-order message with sequence number ${conn.lastReceived}`)
    }

    return bufferToString(plaintextBuffer)
  }
}

module.exports = {
  MessengerClient
}

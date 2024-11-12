'use strict'

/** ******* Imports ********/
const { subtle, CryptoKey } = require('node:crypto').webcrypto
const {
  bufferToString,
  genRandomSalt,
  generateEG,
  computeDH,
  HMACtoAESKey,
  HMACtoHMACKey,
  HKDF,
  encryptWithGCM,
  decryptWithGCM,
  cryptoKeyToJSON,
  govEncryptionDataStr
} = require('./lib')

class MessengerClient {
  constructor(certAuthorityPublicKey, govPublicKey) {
    this.caPublicKey = certAuthorityPublicKey
    this.govPublicKey = govPublicKey
    this.conns = {} // Tracks connections and message state, including out-of-order handling
    this.certs = {}
    this.EGKeyPair = {}
  }

  async generateCertificate(username) {
    try {
      const keyPair = await generateEG({ namedCurve: 'P-256' }) // Explicitly set curve
      this.EGKeyPair = keyPair

      const certificate = {
        username,
        publicKey: await cryptoKeyToJSON(keyPair.pub)
      }

      return certificate
    } catch (error) {
      console.error('Error generating certificate:', error)
      throw error
    }
  }

  async receiveCertificate(certificate, signature) {
    try {
      const certString = JSON.stringify(certificate)
      const certBuffer = new TextEncoder().encode(certString)
      const sigBuffer = new Uint8Array(signature)

      const isValid = await subtle.verify(
        { name: 'ECDSA', hash: { name: 'SHA-384' } },
        this.caPublicKey,
        sigBuffer,
        certBuffer
      )

      if (!isValid) {
        throw new Error('Certificate signature verification failed. Possible tampering detected.')
      }

      this.certs[certificate.username] = certificate
      console.log('Certificate received and verified successfully.')
    } catch (error) {
      console.error('Error verifying certificate:', error)
      throw error
    }
  }

  async sendMessage(name, plaintext) {
    console.log(`Sending message to ${name}...`); // Debug line

    if (!(name in this.conns)) {
      let bobPublicKey = this.certs[name].publicKey

      if (!(bobPublicKey instanceof CryptoKey)) {
        console.log("Importing bob's public key..."); // Debug line
        bobPublicKey = await subtle.importKey(
          'jwk',
          bobPublicKey,
          { name: 'ECDH', namedCurve: 'P-256' }, // Ensure curve consistency
          true,
          []
        )
      }

      const rawRootKey = await computeDH(this.EGKeyPair.sec, bobPublicKey)
      const freshPair = await generateEG({ namedCurve: 'P-256' }) // Ensure curve consistency
      this.EGKeyPair[name] = { pub_key: freshPair.pub, sec_key: freshPair.sec }

      const hkdfInputKey = await computeDH(this.EGKeyPair[name].sec_key, bobPublicKey)
      const [rootKey, chainKey] = await HKDF(hkdfInputKey, rawRootKey, 'ratchet-salt')
      this.conns[name] = {
        rk: rootKey,
        ckS: chainKey,
        lastSent: 0,
        lastReceived: 0,
        outOfOrderMessages: {}
      }
    }

    const conn = this.conns[name]
    conn.lastSent += 1

    const ckS = await HMACtoHMACKey(conn.ckS, 'ck-str')
    const mk = await HMACtoAESKey(conn.ckS, 'mk-str')
    const mkBuffer = await HMACtoAESKey(conn.ckS, 'mk-str', true)
    conn.ckS = ckS

    const ivGov = genRandomSalt()
    const receiverIv = genRandomSalt()
    const newGovPair = await generateEG({ namedCurve: 'P-256' }) // Ensure curve consistency

    const dhSecret = await computeDH(newGovPair.sec, this.govPublicKey)
    const dhSecretKey = await HMACtoAESKey(dhSecret, govEncryptionDataStr)
    const cGov = await encryptWithGCM(dhSecretKey, mkBuffer, ivGov)

    const header = {
      vGov: newGovPair.pub,
      cGov,
      receiverIv,
      ivGov,
      pkSender: this.EGKeyPair[name].pub_key,
      sequenceNumber: conn.lastSent
    }

    const ciphertext = await encryptWithGCM(mk, plaintext, receiverIv, JSON.stringify(header))
    console.log("Message sent successfully!"); // Debug line
    return [header, ciphertext]
  }

  async receiveMessage(name, [header, ciphertext]) {
    if (!(name in this.conns)) {
      throw new Error('Connection with user does not exist. Cannot decrypt message.')
    }

    const conn = this.conns[name]
    const { sequenceNumber } = header

    // Store out-of-order messages until we can process in sequence
    if (sequenceNumber > conn.lastReceived + 1) {
      conn.outOfOrderMessages[sequenceNumber] = [header, ciphertext]
      return null // Return early for out-of-order message
    }

    // Process in-order messages
    const mk = await HMACtoAESKey(conn.ckR, 'mk-str')
    const plaintextBuffer = await decryptWithGCM(mk, ciphertext, header.receiverIv, JSON.stringify(header))
    conn.lastReceived = sequenceNumber

    // Process any buffered out-of-order messages now in sequence
    while (conn.outOfOrderMessages[conn.lastReceived + 1]) {
      const [nextHeader, nextCiphertext] = conn.outOfOrderMessages[conn.lastReceived + 1]
      delete conn.outOfOrderMessages[conn.lastReceived + 1]

      const nextMk = await HMACtoAESKey(conn.ckR, 'mk-str')
      const nextPlaintextBuffer = await decryptWithGCM(
        nextMk,
        nextCiphertext,
        nextHeader.receiverIv,
        JSON.stringify(nextHeader)
      )

      conn.lastReceived += 1
      console.log(`Processed out-of-order message with sequence number ${conn.lastReceived}`)
    }

    return bufferToString(plaintextBuffer)
  }
}

module.exports = {
  MessengerClient
}

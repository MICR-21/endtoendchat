const { subtle } = require('crypto').webcrypto

const ecdsaTest = async function (m) {
  console.log('====================================================')
  console.log('Testing ECDSA on message:', m)
  console.log('----------------------------------------------------')

  console.time('ECDSA Key Generation Total Time')
  const ecdsaKey = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-384' },
    true,
    ['sign', 'verify']
  )
  console.timeEnd('ECDSA Key Generation Total Time')

  console.time('ECDSA Signing Total Time')
  const sig = await subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    ecdsaKey.privateKey,
    Buffer.from(m)
  )
  console.timeEnd('ECDSA Signing Total Time')

  console.time('ECDSA Verify Total Time')
  const ret = await subtle.verify(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    ecdsaKey.publicKey,
    sig,
    Buffer.from(m)
  )
  console.timeEnd('ECDSA Verify Total Time')
  if (ret === false) { throw new Error('verify function failed') }

  console.log('ECDSA Signature Byte Length:', sig.byteLength)
  console.log('====================================================')
}

const rsaTest = async function (m) {
  console.log('====================================================')
  console.log('Testing RSA on message:', m)
  console.log('----------------------------------------------------')

  console.time('RSA Key Generation Total Time')
  const rsaKey = await subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  )
  console.timeEnd('RSA Key Generation Total Time')

  console.time('RSA Signing Total Time')
  const sig = await subtle.sign(
    { name: 'RSA-PSS', saltLength: 32 },
    rsaKey.privateKey,
    Buffer.from(m)
  )
  console.timeEnd('RSA Signing Total Time')

  console.time('RSA Verify Total Time')
  const ret = await subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    rsaKey.publicKey,
    sig,
    Buffer.from(m)
  )
  console.timeEnd('RSA Verify Total Time')
  if (ret === false) { throw new Error('verify function failed') }

  console.log('RSA Signature Byte Length:', sig.byteLength)
  console.log('====================================================')
}

const main = async function () {
  const m = 'using cryptography correctly is important'
  await rsaTest(m)
  await ecdsaTest(m)
}

main()

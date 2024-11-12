# End-to-End Encrypted Messenger Project

This project implements an end-to-end encrypted messenger application using the Double Ratchet algorithm for secure communication. The project includes certificate-based authentication and a mechanism for government surveillance, as per the project’s requirements.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Extra Credit](#extra-credit)
- [Implementation Questions](#implementation-questions)
- [Contributing](#contributing)
- [License](#license)

## Project Overview

This application simulates secure message communication using end-to-end encryption. Each user generates and exchanges ElGamal key pairs, and messages are encrypted and decrypted with Diffie-Hellman (DH) ratcheting. The system supports out-of-order message handling and includes a basic implementation for government surveillance.

## Features

- **End-to-End Encryption**: Messages are encrypted using the Double Ratchet algorithm, ensuring strong security.
- **Certificate-Based Authentication**: Uses certificates to verify the authenticity of user keys.
- **Out-of-Order Message Handling**: Can handle out-of-sequence messages and securely reassemble them.
- **Government Surveillance Compatibility**: Includes a mechanism for decrypting messages if authorized.

## Installation

To install and run the project:

1. **Clone the Repository**:
```bash
git clone https://github.com/yourusername/endtoendchat
cd w24_proj2_source
```
2.**Install Dependencies**: 
   ```bash
  npm install
   ```

3.**Run Test**:
```bash
npm test
```

4. **Linting**:
```bash
npm run lint-fix
```
# Implementation Questions
1. **Could the protocol be modified to increment DH ratchets every 10 messages without compromising confidentiality against an eavesdropper?**
   Yes, the protocol could increment the DH ratchet every 10 messages without compromising semantic security. Ratcheting every message provides stronger forward secrecy, but    increasing the ratchet interval (e.g., every 10 messages) would still maintain adequate confidentiality. This would reduce the frequency of DH computations, improving        efficiency, while preserving a moderate level of forward secrecy.

2. **What if they never update their DH keys at all? Explain the security consequences of this change regarding Forward Secrecy and Break-in Recovery.**
   If DH keys were never updated, the protocol would lose forward secrecy and break-in recovery. Forward Secrecy: An attacker who compromises a DH key could decrypt all past    and future messages, as the static DH key is never replaced. Break-in Recovery: If the DH key is compromised, the protocol cannot recover because the same DH key is       
   continuously used. Regular DH updates mitigate this by isolating any exposure to a single message or a small set of messages.

3. **In the provided conversation, what is the length of the longest sending chain used by Alice? By Bob? Explain.** The longest sending chain used by Alice is 3, while          Bob's longest sending chain is 1. Alice sends three consecutive messages without receiving any response from Bob, which adds to her sending chain. Bob’s chain length         remains at 1 as he sends only one message in response to Alice’s chain.

4. **If Mallory compromises Alice’s phone before she sends her third message, she cannot determine the locker combination. Explain why.**
   Mallory cannot determine the locker combination due to forward secrecy. Since the protocol uses DH ratcheting, each message is encrypted with a unique key derived            independently for each communication step. Mallory’s access to Alice's phone after the locker combination was sent does not grant her access to previous DH keys, keeping      the locker combination secure.
   
5. **Why might the method of government surveillance in this project be flawed? What are the major risks?**
   The method of government surveillance has several flaws and risks:
   - Risk of Misuse: If the government’s private key is compromised, an attacker could decrypt all communications.
   - Privacy Concerns: Users may feel their privacy is violated, leading to potential mistrust and reluctance to use the system.
   - Technical Vulnerabilities: Backdoor access introduces a weak point in the system that attackers could exploit, leading to a security breach.

6. **Comparing ECDSA and RSA for Signatures**
   | Parameter                     | ECDSA (P-384)      | RSA (4096-bit)      |
   |-------------------------------|--------------------|---------------------|
   | **Key Generation Time**       | Faster             | Slower              |
   | **Signature Generation Time** | Faster             | Slower              |
   | **Signature Length**          | Shorter            | Longer              |
   | **Verification Time**         | Faster             | Slower              |

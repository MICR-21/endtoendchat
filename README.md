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
   git clone https://github.com/yourusername/end-to-end-chat
   cd end-to-end-chat
2.**Install Dependencies**: 
  npm install
3. **Run Test**:
  npm test
4. **Linting**:
  npm run lint-fix


const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const firebaseConfig = require('../../firebase.config');

function getCredential() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    return {
      credential: admin.credential.applicationDefault(),
      source: 'application-default'
    };
  }

  const rootKeyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  if (fs.existsSync(rootKeyPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const serviceAccount = require(rootKeyPath);
    return {
      credential: admin.credential.cert(serviceAccount),
      source: 'service-account:root'
    };
  }

  const secureKeyPath = path.resolve(
    __dirname,
    '../../backend/secure/firebase-admin-key.json'
  );
  if (fs.existsSync(secureKeyPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const serviceAccount = require(secureKeyPath);
    return {
      credential: admin.credential.cert(serviceAccount),
      source: 'service-account:backend/secure'
    };
  }

  return {
    credential: null,
    source: process.env.FIRESTORE_EMULATOR_HOST ? 'emulator' : 'none'
  };
}

function initializeAdmin() {
  if (admin.apps.length) {
    if (!admin.__assignmintCredentialSource) {
      admin.__assignmintCredentialSource = 'existing-instance';
    }
    return admin;
  }

  const { credential, source } = getCredential();
  if (!credential && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Firebase Admin credential not found. Provide serviceAccountKey.json or set GOOGLE_APPLICATION_CREDENTIALS.'
    );
  }

  const options = {
    projectId: firebaseConfig.projectId
  };

  if (credential) {
    options.credential = credential;
  }

  admin.initializeApp(options);
  admin.__assignmintCredentialSource = source;
  return admin;
}

const adminInstance = initializeAdmin();

module.exports = adminInstance;


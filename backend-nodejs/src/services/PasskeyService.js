import crypto from 'crypto';

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

import db from '../config/database.js';
import { env } from '../config/env.js';
import DomainEventModel from '../models/DomainEventModel.js';
import UserModel from '../models/UserModel.js';
import UserPasskeyChallengeModel from '../models/UserPasskeyChallengeModel.js';
import UserPasskeyModel from '../models/UserPasskeyModel.js';

const passkeyConfig = env.security.passkeys;

function ensurePasskeySupport() {
  if (!passkeyConfig?.rpId || !passkeyConfig?.origins?.length) {
    const error = new Error('Passkey support is not configured.');
    error.status = 503;
    throw error;
  }
}

function asBase64Url(buffer) {
  if (!buffer) {
    return '';
  }
  return isoBase64URL.fromBuffer(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
}

function toBuffer(value) {
  if (!value) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return isoBase64URL.toBuffer(value);
  }
  return Buffer.from(value);
}

function buildUserDisplayName(user) {
  const parts = [user.firstName, user.lastName].filter((part) => typeof part === 'string' && part.trim().length > 0);
  return parts.length ? parts.join(' ') : user.email;
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  return metadata;
}

export default class PasskeyService {
  static async issueRegistrationOptions(userId, metadata = null, context = {}) {
    ensurePasskeySupport();

    return db.transaction(async (trx) => {
      const user = await UserModel.findById(userId, trx);
      if (!user) {
        const error = new Error('User not found.');
        error.status = 404;
        throw error;
      }

      const existing = await UserPasskeyModel.listForUser(user.id, trx);

      const options = await generateRegistrationOptions({
        rpID: passkeyConfig.rpId,
        rpName: passkeyConfig.rpName,
        userID: String(user.id),
        userName: user.email,
        userDisplayName: buildUserDisplayName(user),
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred'
        },
        timeout: passkeyConfig.challengeTtlSeconds * 1000,
        excludeCredentials: existing.map((passkey) => ({
          id: toBuffer(passkey.credentialId),
          type: 'public-key',
          transports: passkey.transports ?? []
        }))
      });

      const requestId = crypto.randomUUID();

      await UserPasskeyChallengeModel.create(
        {
          requestId,
          userId: user.id,
          email: user.email,
          type: 'registration',
          challenge: toBuffer(options.challenge),
          optionsSnapshot: options,
          metadata: {
            ...normalizeMetadata(metadata),
            issuedIp: context.ipAddress ?? null,
            issuedUserAgent: context.userAgent ?? null
          },
          expiresAt: new Date(Date.now() + passkeyConfig.challengeTtlSeconds * 1000)
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.passkey_registration_started',
          payload: {
            requestId,
            existingCredentialCount: existing.length,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          },
          performedBy: user.id
        },
        trx
      );

      return {
        requestId,
        options
      };
    });
  }

  static async completeRegistration(requestId, response, context = {}) {
    ensurePasskeySupport();

    return db.transaction(async (trx) => {
      const challenge = await UserPasskeyChallengeModel.findActive(requestId, trx, { forUpdate: true });
      if (!challenge || challenge.type !== 'registration') {
        const error = new Error('Passkey registration session has expired.');
        error.status = 410;
        throw error;
      }

      const user = await UserModel.findById(challenge.userId, trx);
      if (!user) {
        const error = new Error('User not found.');
        error.status = 404;
        throw error;
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: asBase64Url(challenge.challenge),
        expectedOrigin: passkeyConfig.origins,
        expectedRPID: passkeyConfig.rpId,
        requireUserVerification: true
      });

      if (!verification.verified || !verification.registrationInfo) {
        const error = new Error('Passkey registration could not be verified.');
        error.status = 400;
        throw error;
      }

      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const passkey = await UserPasskeyModel.create(
        {
          userId: user.id,
          credentialId: asBase64Url(credentialID),
          credentialPublicKey,
          signatureCounter: counter,
          friendlyName: response.clientExtensionResults?.prf?.evalByCredential?.friendlyName ?? null,
          credentialDeviceType,
          credentialBackedUp,
          transports: response.response?.transports ?? verification.registrationInfo?.transports ?? null,
          metadata: {
            completionIp: context.ipAddress ?? null,
            completionUserAgent: context.userAgent ?? null,
            requestMetadata: challenge.metadata ?? null
          },
          lastUsedAt: new Date()
        },
        trx
      );

      await UserPasskeyChallengeModel.consume(
        requestId,
        { reason: 'completed', ipAddress: context.ipAddress ?? null, userAgent: context.userAgent ?? null },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.passkey_registered',
          payload: {
            requestId,
            credentialId: passkey.credentialId,
            credentialDeviceType,
            credentialBackedUp,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          },
          performedBy: user.id
        },
        trx
      );

      return {
        user,
        passkey
      };
    });
  }

  static async issueAuthenticationOptions({ email }, context = {}) {
    ensurePasskeySupport();

    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    if (!normalizedEmail) {
      const error = new Error('Email is required to locate your passkeys.');
      error.status = 422;
      throw error;
    }

    return db.transaction(async (trx) => {
      const user = await UserModel.findByEmail(normalizedEmail, trx);
      if (!user) {
        const error = new Error('We could not find an account for that email.');
        error.status = 404;
        throw error;
      }

      const registered = await UserPasskeyModel.listForUser(user.id, trx);
      if (!registered.length) {
        const error = new Error('No passkeys are registered for this account.');
        error.status = 412;
        error.code = 'PASSKEY_ENROLLMENT_REQUIRED';
        throw error;
      }

      const options = await generateAuthenticationOptions({
        rpID: passkeyConfig.rpId,
        timeout: passkeyConfig.challengeTtlSeconds * 1000,
        allowCredentials: registered.map((passkey) => ({
          id: toBuffer(passkey.credentialId),
          type: 'public-key',
          transports: passkey.transports ?? []
        })),
        userVerification: 'preferred'
      });

      const requestId = crypto.randomUUID();

      await UserPasskeyChallengeModel.create(
        {
          requestId,
          userId: user.id,
          email: user.email,
          type: 'authentication',
          challenge: toBuffer(options.challenge),
          optionsSnapshot: options,
          metadata: {
            issuedIp: context.ipAddress ?? null,
            issuedUserAgent: context.userAgent ?? null
          },
          expiresAt: new Date(Date.now() + passkeyConfig.challengeTtlSeconds * 1000)
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.passkey_authentication_started',
          payload: {
            requestId,
            credentialCount: registered.length,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          },
          performedBy: user.id
        },
        trx
      );

      return {
        requestId,
        options
      };
    });
  }

  static async verifyAuthentication(requestId, response, context = {}) {
    ensurePasskeySupport();

    return db.transaction(async (trx) => {
      const challenge = await UserPasskeyChallengeModel.findActive(requestId, trx, { forUpdate: true });
      if (!challenge || challenge.type !== 'authentication') {
        const error = new Error('Passkey authentication session has expired.');
        error.status = 410;
        throw error;
      }

      const user = await UserModel.findById(challenge.userId, trx);
      if (!user) {
        const error = new Error('User not found.');
        error.status = 404;
        throw error;
      }

      const credentialId = response.id ?? response.rawId;
      const passkey = await UserPasskeyModel.findByCredentialId(credentialId, trx);
      if (!passkey) {
        const error = new Error('Passkey credential is not recognised.');
        error.status = 401;
        error.code = 'PASSKEY_NOT_FOUND';
        throw error;
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: asBase64Url(challenge.challenge),
        expectedOrigin: passkeyConfig.origins,
        expectedRPID: passkeyConfig.rpId,
        requireUserVerification: true,
        authenticator: {
          credentialID: toBuffer(passkey.credentialId),
          credentialPublicKey: passkey.credentialPublicKey,
          counter: passkey.signatureCounter,
          transports: passkey.transports ?? []
        }
      });

      if (!verification.verified || !verification.authenticationInfo) {
        const error = new Error('Passkey authentication could not be verified.');
        error.status = 401;
        throw error;
      }

      const { newCounter } = verification.authenticationInfo;
      if (typeof newCounter === 'number' && newCounter >= 0) {
        await UserPasskeyModel.updateCounter(passkey.id, newCounter, trx);
      } else {
        await UserPasskeyModel.touchUsage(passkey.id, trx);
      }

      await UserPasskeyChallengeModel.consume(
        requestId,
        { reason: 'completed', ipAddress: context.ipAddress ?? null, userAgent: context.userAgent ?? null },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.passkey_authenticated',
          payload: {
            requestId,
            credentialId: passkey.credentialId,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          }
        },
        trx
      );

      return {
        user,
        passkey
      };
    });
  }
}

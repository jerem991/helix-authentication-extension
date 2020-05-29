//
// Copyright 2020 Perforce Software
//
const { assert } = require('chai')
const { after, before, describe, it } = require('mocha')
const { P4 } = require('p4api')
const helpers = require('./helpers')
const runner = require('./runner')

describe('Extension', function () {
  let serviceProcess

  before(async function () {
    const config = {
      port: runner.config.port,
      p4root: runner.config.p4root
    }
    await runner.startServer(config)
    // establish a super user and create the test user
    helpers.establishSuper(runner.config)
    helpers.createUser({
      User: 'repoman',
      Email: 'repoman@example.com',
      FullName: 'Repo Man'
    }, runner.config)
    // start the authentication mock service
    serviceProcess = helpers.startService(3003)
  })

  after(async function () {
    const config = {
      user: runner.config.user,
      password: runner.config.password,
      port: runner.config.port
    }
    await runner.stopServer(config)
    serviceProcess.kill()
  })

  describe('Success cases', function () {
    describe('login with OpenID Connect', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'oidc', 'http://localhost:3003/pass/oidc')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already verified the profile so we have a ticket
        assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
      })
    })

    describe('login with SAML 2.0', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'saml', 'http://localhost:3003/pass/saml')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already verified the profile so we have a ticket
        assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
      })
    })

    describe('login with mixed case identifier', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'saml', 'http://localhost:3003/pass/case')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already verified the profile so we have a ticket
        assert.equal(loginCmd.stat[0].TicketExpiration, '43200')
      })
    })
  })

  describe('Failure cases', function () {
    describe('extension receives 401 from service', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'oidc', 'http://localhost:3003/fail/401')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already failed validation
        assert.include(loginCmd.error[1].data, 'validation failed')
      })
    })

    describe('extension receives 403 from service', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'oidc', 'http://localhost:3003/fail/403')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already failed validation
        assert.include(loginCmd.error[1].data, 'validation failed')
      })
    })

    describe('extension receives 408 from service', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'oidc', 'http://localhost:3003/fail/408')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already failed validation
        assert.include(loginCmd.error[1].data, 'validation failed')
      })
    })

    describe('extension receives error in pre-sso', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'oidc', 'http://localhost:3003/fail/start')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should fallback to attempting the ususal SSO login which fails
        // because P4LOGINSSO is not set in the client
        assert.include(loginCmd.error[0].data, 'Single sign-on on client failed')
      })
    })

    describe('user identifiers do not match', function () {
      const config = {
        P4USER: 'repoman',
        P4PORT: 'localhost:2666',
        P4USEBROWSER: false
      }

      before(function () {
        // install and configure the extension
        helpers.installExtension(runner.config)
        helpers.configureExtension(runner.config, 'oidc', 'http://localhost:3003/fail/mismatch')
        helpers.restartServer(runner.config)
      })

      it('should login successfully', function () {
        const p4 = new P4(config)
        const loginCmd = p4.cmdSync('login')
        // should prompt the user to open a URL
        assert.include(loginCmd.error[0].data, 'Navigate to URL')
        // and it has already failed validation
        assert.include(loginCmd.error[1].data, 'validation failed')
      })
    })
  })
})

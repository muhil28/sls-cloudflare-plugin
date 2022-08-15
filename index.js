'use strict';
const _ = require('lodash');
const Bb = require('bluebird');
const BasePlugin = require('base-serverless-plugin');
const Cloudflare = require("./src/CloudflareDns.js")
const Commands = require('./src/Commands');

const LOG_PREFFIX = '[ServerlessCloudFlare] -';

class ServerlessCloudFlarePlugin extends BasePlugin {
  /**
   * Serverless plugin constructor
   *
   * @param {object} serverless serverless instance
   * @param {object} options command line arguments
   */
  constructor(serverless, options) {
    super(serverless, options, LOG_PREFFIX, 'cloudflare');

    this.hooks = {
      'info:info': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(() => {
              this.CloudFlare.listRecords()
          })
          .then(this.log)
          .catch(_.identity),
      'after:deploy:deploy': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(this.resolveCnameValue)
          .then(async () => {
              for (const record of this.CloudFlare.ctx.cfg.records){
                this.CloudFlare.ctx.cfg.record = record;
                try{
                    await this.resolveCnameValue()

                    if (!this.validate(record)) return 'Invalid';
                    const oldRecord = await this.CloudFlare.getRecord();
                    var id;
                    var oldContent;
                    if (!_.isEmpty(oldRecord)) {
                        id = _.get(oldRecord, 'id');
                        oldContent = _.get(oldRecord, 'content');
                    }
                    if (_.isEmpty(oldRecord)) {
                        await this.CloudFlare.createRecord();
                    } else if (oldContent !== record.content) {
                        await this.CloudFlare.updateRecord();
                    } else {
                        console.log('CF_RECORD_EXISTENT');
                        }
                }catch(err){
                    console.log(err);
                }
              }
          })
          .then(this.log)
          .catch(_.identity),
      'after:remove:remove': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(async () => {
              for (const record of this.CloudFlare.ctx.cfg.records){
                this.CloudFlare.ctx.cfg.record = record;
                try{
                 await this.CloudFlare.deleteRecord()
                }catch(err){
                    console.log(err);
                }
              }
          })
          .then(this.log)
          .catch(_.identity),
      'cloudflare:record:deploy:deploy': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(async () => {
              for (const record of this.CloudFlare.ctx.cfg.records){
                this.CloudFlare.ctx.cfg.record = record;
                try{
                    await this.resolveCnameValue()

                    if (!this.validate(record)) return 'Invalid';
                    const oldRecord = await this.CloudFlare.getRecord();
                    var id;
                    var oldContent;
                    if (!_.isEmpty(oldRecord)) {
                        id = _.get(oldRecord, 'id');
                        oldContent = _.get(oldRecord, 'content');
                    }
                    if (_.isEmpty(oldRecord)) {
                        await this.CloudFlare.createRecord();
                    } else if (oldContent !== record.content) {
                        await this.CloudFlare.updateRecord();
                    } else {
                        console.log('CF_RECORD_EXISTENT');
                        }
                }catch(err){
                    console.log(err);
                }
              }
          })
          .then(this.log)
          .catch(_.identity),
      'cloudflare:record:update:update': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(async () => {
              for (const record of this.CloudFlare.ctx.cfg.records){
                this.CloudFlare.ctx.cfg.record = record;
                try{
                    await this.resolveCnameValue()
                    await this.CloudFlare.updateRecord()
                } catch(error) {
                    console.log(error);
                }
              }
          })
          .then(this.log)
          .catch(_.identity),
      'cloudflare:record:remove:remove': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(async () => {
              for (const record of this.CloudFlare.ctx.cfg.records){
                this.CloudFlare.ctx.cfg.record = record;
                try{
                 await this.CloudFlare.deleteRecord()
                }catch(err){
                    console.log(err);
                }
              }
          })
          .then(this.log)
          .catch(_.identity),
      'cloudflare:record:list:list': () =>
        Bb.bind(this)
          .then(this.initialize)
          .then(() => {
              this.CloudFlare.listRecords()
          })
          .then(this.log)
          .catch(_.identity),
    };
    this.commands = Commands;
  }

  /**
   * Initialize User config variables.
   *
   */
  initialize() {
    if (this.isPluginDisabled()) {
      this.log('warning: plugin is disabled');
      return Promise.reject(new Error('PLUGIN_DISABLED'));
    }
    console.log("Initializing cloudflare started...");
    try {
            this.cfg = {
                auth: {}
            };
            // you can disable the serverless lifecycle events
            // this.cfg.autoDeploy = this.getConf('autoDeploy', true);
            // this.cfg.autoRemove = this.getConf('autoRemove', true);

            this.cfg.domain = this.getConf('domain');

            console.log(`Domain set to ${this.cfg.domain}`);
            // this.cfg.auth.key = this.getConf('auth.key', undefined);
            // this.cfg.auth.email = this.getConf('auth.email', undefined);
            this.cfg.auth.apiToken = this.getConf('auth.apiToken', undefined);
            this.validateCredentials();

            const records = this.getConf('records', {});
            if (!_.isEmpty(records)) {
                // REQUIRED FIELDS
                this.cfg.records =  records;
            }
            const ctx = this;
            this.CloudFlare = new Cloudflare(ctx)

            console.log("Initialization Completed successfully");
            return Bb.resolve();
        } catch(error) {
            console.log(error);
        }
  }

  validate(record) {
      const name = _.get(record, 'name');
      const content = _.get(record, 'content');

      return !_.isEmpty(name) && !_.isEmpty(content);
  }
  /**
   * Resolve Cloud Formation Record Content useful for CloudFront (dinamic domain)
   *
   * @returns {Promise} Domain value
   */
  async resolveCnameValue() {
    try{
        const expr = _.get(this.cfg, 'record.content');
        const re = new RegExp(/^#\{cf:(.*)}/);

        if (!_.isEmpty(expr) && expr.startsWith('#{')) {
            const cfMatch = expr.match(re);

        if (_.isEmpty(cfMatch) || cfMatch.length < 2) {
            let msg = '';
            msg += 'CLOUD_FLARE_CONFIG: Invalid Variable Syntax for ';
            msg += '"CloudFormation" resolver... Should be #{cf:SomeOutputKey}. ';
            throw new Error(msg);
        }
        const [, targetKey] = cfMatch;
        const aws = this.serverless.getProvider('aws');
        const q = { StackName: this.serverless.getProvider('aws').naming.getStackName() };
        const res = await aws.request('CloudFormation', 'describeStacks', q, {});

        const allOutputs = _.get(res, 'Stacks[0].Outputs', []);
        const outFounds = allOutputs.filter((out) => out.OutputKey === targetKey);

        if (_.isEmpty(outFounds) || outFounds.length < 1) {
            let msg = '';
            msg += 'CLOUD_FLARE_KEY_NOT_FOUND: CloudFormation key not found ';
            msg += `'${targetKey}'.. `;

            throw new Error(msg);
        }

        _.set(this.cfg, 'record.content', outFounds[0].OutputValue);
        }

        return Bb.resolve();
    }catch(error) {
        console.log(error);
    }
  }

  /**
   * Validate CloudFlare auth credentials methods.
   *
   */
  validateCredentials() {
    if (_.isEmpty(this.cfg.auth.apiToken)) {
      // if (_.isEmpty(this.cfg.auth.email) || _.isEmpty(this.cfg.auth.key)) {
        let err = '';
        err += 'CLOUD_FLARE_AUTH_CRED_MISSING: ';
        throw new Error(err);
      // }
    }
    console.log("Validation of API_TOKEN Successful");
  }
}

module.exports = ServerlessCloudFlarePlugin;

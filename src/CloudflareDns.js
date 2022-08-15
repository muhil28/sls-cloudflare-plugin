'use strict';

const https = require('https');
const _ = require('lodash');

class CloudflareDns {
    
    constructor(ctx) {
        this.ctx = ctx;
        this.zoneName= this.ctx.cfg.domain;
        this.hostName="api.cloudflare.com";
        this.authorization = `Bearer ${this.ctx.cfg.auth.apiToken.API_TOKEN}` //${process.env.CF_API}`
    }
    async listZones() {
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data = data + chunk.toString();
            });
        
            response.on('end', () => {
                const body = JSON.parse(data);
                console.log(body);
            });
        })
        request.on('error', (error) => {
            console.log('An error', error);
        });
        
        request.end()
    }
    async getZoneId() {
        const { domain } = this.ctx.cfg
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones?name=${domain}`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
        const zoneId = new Promise((resolve) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data = data + chunk.toString();
                });
            
                response.on('end', () => {
                    const body = JSON.parse(data);
                    resolve(body.result[0].id);
                });
            })
            request.on('error', (error) => {
                console.log('An error', error);
            });
            
            request.end()
        });
        return await zoneId;
    }
    async createRecord() {
        const { record } = this.ctx.cfg;
        console.log(`Record to be created...\n`)
        console.log(record);
        const data = JSON.stringify({
            type: record.type,
            name: record.name,
            content: record.content,
            ttl: record.ttl,
            priority: record.priority,
            proxied: record.proxied
        });
        const zoneId = await this.getZoneId()
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones/${zoneId}/dns_records`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
        const request = https.request(options, (response) => {
            let responseBody = '';
            response.on('data', (chunk) => {
                responseBody = responseBody + chunk.toString();
            });
        
            response.on('end', () => {
                const body = JSON.parse(responseBody);
                console.log(body);
            });
        })
        
        request.on('error', (error) => {
            console.log('An error', error);
        });
        request.write(data); 
        request.end()
    }

    async listRecords() {
        const zoneId = await this.getZoneId()
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones/${zoneId}/dns_records`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data = data + chunk.toString();
                });
            
                response.on('end', () => {
                    const body = JSON.parse(data);
                    for (const record of body.result) {
                        console.log(record);
                    }
                });
            })
            request.on('error', (error) => {
                console.log('An error', error);
            });
            
            request.end()
    }
    async getRecord() {
        const { record } = this.ctx.cfg;
        const zoneId = await this.getZoneId()
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones/${zoneId}/dns_records?type=${record.type}&name=${record.name}`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
        const Record = new Promise((resolve) => {
            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data = data + chunk.toString();
                });
            
                response.on('end', () => {
                    const body = JSON.parse(data);
                    const result = body.result[0]
                    resolve(result);
                    // console.log(body.result[0].id);
                });
            })
            request.on('error', (error) => {
                console.log('An error', error);
            });
            
            request.end()
        });
        return await Record;
    }
    async updateRecord() {
        const { record } = this.ctx.cfg;
        console.log(`Record to be updated...\n`)
        console.log(record);
        const data = JSON.stringify({
            type: record.type,
            name: record.name,
            content: record.content,
            ttl: record.ttl,
            proxied: record.proxied
        });
        const zoneId = await this.getZoneId();
        const recordId = await this.getRecord();
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones/${zoneId}/dns_records/${recordId.id}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
        const request = https.request(options, (response) => {
            let responseBody = '';
            response.on('data', (chunk) => {
                responseBody = responseBody + chunk.toString();
            });
        
            response.on('end', () => {
                const body = JSON.parse(responseBody);
                console.log(body);
            });
        })
        
        request.on('error', (error) => {
            console.log('An error', error);
        });
        request.write(data); 
        request.end()
    }
    async deleteRecord() {
        const zoneId = await this.getZoneId();
        const recordId = await this.getRecord();
        const options = {
                hostname: this.hostName,
                port: 443,
                path: `/client/v4/zones/${zoneId}/dns_records/${recordId.id}`,
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authorization
                },
            };
        const request = https.request(options, (response) => {
            let responseBody = '';
            response.on('data', (chunk) => {
                responseBody = responseBody + chunk.toString();
            });
        
            response.on('end', () => {
                const body = JSON.parse(responseBody);
                console.log(body);
            });
        })
        
        request.on('error', (error) => {
            console.log('An error', error);
        });
        request.end()
    }
}
module.exports = CloudflareDns

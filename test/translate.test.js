/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

// Passing arrow functions to mocha is discouraged: https://mochajs.org/#arrow-functions
// return promises from mocha tests rather than calling done() - http://tobyho.com/2015/12/16/mocha-with-promises/


/* eslint quote-props:0, quotes:0*/

const Helper = require('hubot-test-helper');
const helper = new Helper('../src/scripts');
const expect = require('chai').expect;
const rewire = require('rewire');
const translateAPI = rewire('../src/scripts/translate.js');
const sprinkles = require('mocha-sprinkles');
const nock = require('nock');

const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../src/messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

const timeout = 5000;

const identifiable_languages_response = {
	"languages": [{
		"language": "ar",
		"name": "Arabic"
	}, {
		"language": "en",
		"name": "English"
	}, {
		"language": "es",
		"name": "Spanish"
	}, {
		"language": "fr",
		"name": "French"
	}, {
		"language": "pt",
		"name": "Portuguese"
	}]
};

const supported_model_response = {
	"models": [{
		"model_id": "ar-en-conversational",
		"source": "ar",
		"target": "en",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "en-ar-conversational",
		"source": "en",
		"target": "ar",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "en-es-conversational",
		"source": "en",
		"target": "es",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "en-fr-conversational",
		"source": "en",
		"target": "fr",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "en-pt-conversational",
		"source": "en",
		"target": "pt",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "es-en-conversational",
		"source": "es",
		"target": "en",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "fr-en-conversational",
		"source": "fr",
		"target": "en",
		"domain": "conversational",
		"status": "available"
	}, {
		"model_id": "pt-en-conversational",
		"source": "pt",
		"target": "en",
		"domain": "conversational",
		"status": "available"
	}]
};

const identified_language_response = {
	languages: [{
		language: 'en',
		confidence: '0.75'
	}]
};

function waitForMessageQueue(room, len) {
	return sprinkles.eventually({
		timeout: timeout
	}, function() {
		if (room.messages.length < len) {
			throw new Error('too soon');
		}
	}).then(() => false).catch(() => true).then((success) => {
		// Great.  Move on to tests
		expect(room.messages.length).to.eql(len);
	});
}

describe('Test translate via Reg Ex', function() {

	let translate = {};
	translate.startup = translateAPI.__get__('startup');
	translate.buildSupportedLanguageMatrix = translateAPI.__get__('buildSupportedLanguageMatrix');

	let room;

	before(function() {
		nock('https://gateway.watsonplatform.net/language-translation/api/v2').get('/identifiable_languages').reply(200,
			identifiable_languages_response);
		nock('https://gateway.watsonplatform.net/language-translation/api/v2').get('/models').reply(200,
			supported_model_response);

		return translate.startup({
			logger: {
				debug: function() {},
				error: function() {}
			}
		}, {});
	});

	beforeEach(function() {
		nock('https://gateway.watsonplatform.net/language-translation/api/v2').get('/identifiable_languages').reply(200,
			identifiable_languages_response);
		nock('https://gateway.watsonplatform.net/language-translation/api/v2').get('/models').reply(200,
			supported_model_response);
		nock('https://gateway.watsonplatform.net/language-translation/api/v2').post('/identify', 'hello').reply(200,
			identified_language_response);
		nock('https://gateway.watsonplatform.net/language-translation/api/v2').post('/translate', {
			text: 'hello',
			model_id: 'en-es-conversational'
		}).reply(200, {
			translations: [{
				translation: 'Hola'
			}]
		});
		room = helper.createRoom();

		// Force all emits into a reply.
		room.robot.on('ibmcloud.formatter', function(event) {
			if (event.message) {
				event.response.reply(event.message);
			}
			else {
				event.response.send({
					attachments: event.attachments
				});
			}
		});
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `translate list languages`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot translate list languages');
		});

		it('should respond with the list of language', function() {
			return waitForMessageQueue(room, 2).then(() => {
				// Great.  Move on to tests
				expect(room.messages.length).to.eql(2);
				expect(room.messages[1][1]).to.be.a('string');
				expect(room.messages[1][1]).to.equal('@mimiron ' + translate.buildSupportedLanguageMatrix());
			});
		});
	});

	context('user calls `translate phrase`', function() {
		it('should respond with the translation spanish translation for hello', function() {
			return room.user.say('mimiron', '@hubot translate phrase spanish hello').then(() => {
				return waitForMessageQueue(room, 3);
			}).then(() => {
				// Great.  Move on to tests
				expect(room.messages.length).to.eql(3);
				expect(room.messages[2][1]).to.be.a('string');
				expect(room.messages[2][1]).to.equal('@mimiron ' + i18n.__('translate.phrase.output', 'Spanish', 'Hola', ''));
			});
		});

		it('should respond with the translation english translation for hello', function() {
			return room.user.say('mimiron', '@hubot translate phrase english hello').then(() => {
				return waitForMessageQueue(room, 3);
			}).then(() => {
				// Great.  Move on to tests
				expect(room.messages.length).to.eql(3);
				expect(room.messages[2][1]).to.be.a('string');
				expect(room.messages[2][1]).to.equal('@mimiron ' + i18n.__('translate.phrase.output', 'English', 'hello',
					' :)'));
			});
		});

		it('should respond with the translation foobar translation for hello', function() {
			return room.user.say('mimiron', '@hubot translate phrase foobar hello').then(() => {
				return waitForMessageQueue(room, 2);
			}).then(() => {
				// Great.  Move on to tests
				expect(room.messages.length).to.eql(2);
				expect(room.messages[1][1]).to.be.a('string');
				return room.user.say('mimiron', '@hubot 5');
			}).then(() => {
				return waitForMessageQueue(room, 6);
			}).then(() => {
				expect(room.messages[5][1]).to.equal('@mimiron ' + i18n.__('translate.phrase.output', 'Spanish', 'Hola', ''));
			});
		});

		it('should respond with the translation english translation for como estas', function() {
			nock('https://gateway.watsonplatform.net/language-translation/api/v2').post('/identify', 'como estas').reply(
				200, {
					languages: [{
						language: 'es',
						confidence: '0.50'
					}, {
						language: 'pt',
						confidence: '0.25'
					}, {
						language: 'ar',
						confidence: '0.001'
					}]
				});
			nock('https://gateway.watsonplatform.net/language-translation/api/v2').post('/translate', {
				text: 'como estas',
				model_id: 'es-en-conversational'
			}).reply(200, {
				translations: [{
					translation: 'How are you?'
				}]
			});
			return room.user.say('mimiron', '@hubot translate phrase english como estas').then(() => {
				return waitForMessageQueue(room, 2);
			}).then(() => {
				// Great.  Move on to tests
				expect(room.messages.length).to.eql(2);
				expect(room.messages[1][1]).to.be.a('string');
				return room.user.say('mimiron', '@hubot 1');
			}).then(() => {
				return waitForMessageQueue(room, 6);
			}).then(() => {
				expect(room.messages[5][1]).to.equal('@mimiron ' + i18n.__('translate.phrase.output', 'English',
					'How are you?', ''));
			});

		});
	});

	context('user calls `translate help`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot translate help');
		});

		it('should respond with the help', function() {
			expect(room.messages.length).to.eql(2);
			expect(room.messages[1][1]).to.be.a('string');
		});
	});

	context('user calls `translate help`', function() {
		beforeEach(function() {
			return room.user.say('mimiron', '@hubot translate help');
		});

		it('should respond with the help', function() {
			expect(room.messages.length).to.eql(2);
			expect(room.messages[1][1]).to.be.a('string');
			let help =
				'hubot translate phrase [language] [phrase] - ' + i18n.__('help.translate.phrase') + '\n';
			help += 'hubot translate list languages - ' + i18n.__('help.translate.list') + '\n';


			expect(room.messages[1]).to.eql(['hubot', '@mimiron \n' + help]);
		});
	});


});

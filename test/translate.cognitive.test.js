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
const nock = require('nock');

var i18n = new (require('i18n-2'))({
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


describe('Test translate via Natural Language', function() {

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
	});

	afterEach(function() {
		room.destroy();
	});

	context('user calls `translate list languages`', function() {
		it('should respond with the list of language', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					expect(event.message).to.be.a('string');
					expect(event.message).to.contain(translate.buildSupportedLanguageMatrix());
					done();
				}
			});

			var res = { message: {text: 'Show translatable languages', user: {id: 'anId'}}, response: room };
			room.robot.emit('translate.list', res, {});
		});
	});

	context('user calls `translate phrase`', function() {
		it('should respond with the translation spanish translation for hello', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					if (event.message.indexOf(i18n.__('translate.phrase.info', 'English', 'Spanish')) >= 0){
						expect(event.message).to.be.a('string');
						expect(event.message).to.contain(i18n.__('translate.phrase.info', 'English', 'Spanish'));
					}
					if (event.message.indexOf('Hola') >= 0) {
						done();
					}
				}
			});

			var res = { message: {text: 'translate the following phrase into spanish hello', user: {id: 'anId'}}, response: room };
			room.robot.emit('translate.phrase', res, {targetLanguage: 'Spanish', phraseToTranslate: 'hello'});
		});

		it('should respond with the failure to translate due to missing targetLanguage', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					expect(event.message).to.be.a('string');
					expect(event.message).to.contain(i18n.__('cognitive.parse.problem.targetLanguage'));
					done();
				}
			});

			var res = { message: {text: 'translate the following phrase into spanish hello', user: {id: 'anId'}}, response: room };
			room.robot.emit('translate.phrase', res, {phraseToTranslate: 'hello'});
		});

		it('should respond with the failure to translate due to missing phraseToTranslate', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					expect(event.message).to.be.a('string');
					expect(event.message).to.contain(i18n.__('cognitive.parse.problem.phraseToTranslate'));
					done();
				}
			});

			var res = { message: {text: 'translate the following phrase into spanish hello', user: {id: 'anId'}}, response: room };
			room.robot.emit('translate.phrase', res, {targetLanguage: 'Spanish'});
		});
	});

	context('user calls `translate help`', function() {
		it('should respond with the help', function(done) {
			room.robot.on('ibmcloud.formatter', (event) => {
				if (event.message) {
					expect(event.message).to.be.a('string');
					expect(event.message).to.contain('translate phrase [language] [phrase]');
					expect(event.message).to.contain('translate list languages');
					done();
				}
			});

			var res = { message: {text: 'help translate', user: {id: 'anId'}}, response: room };
			room.robot.emit('translate.help', res, {});
		});
	});


});

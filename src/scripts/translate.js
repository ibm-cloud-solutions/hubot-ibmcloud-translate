// Description:
//	Always listening, waiting to translate
//
// Configuration:
//	 HUBOT_WATSON_TRANSLATE_USER User name for accessing the Watson API
//	 HUBOT_WATSON_TRANSLATE_PASSWORD Password for accessing the Watson API
//
// Author:
//  @nsandona
//

/*
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2016. All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
'use strict';

const path = require('path');
const TAG = path.basename(__filename);
const watson = require('watson-developer-cloud');
const _ = require('lodash');
const Conversation = require('hubot-conversation');
const activity = require('hubot-ibmcloud-activity-emitter');
const utils = require('hubot-ibmcloud-utils').utils;

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || 0.10);
const HUBOT_WATSON_TRANSLATE_USER = process.env.HUBOT_WATSON_TRANSLATE_USER;
const HUBOT_WATSON_TRANSLATE_PASSWORD = process.env.HUBOT_WATSON_TRANSLATE_PASSWORD;
const HUBOT_WATSON_TRANSLATE_API = process.env.HUBOT_WATSON_TRANSLATE_API;

const i18n = new (require('i18n-2'))({
	locales: ['en'],
	extension: '.json',
	// Add more languages to the list of locales when the files are created.
	directory: __dirname + '/../messages',
	defaultLocale: 'en',
	// Prevent messages file from being overwritten in error conditions (like poor JSON).
	updateFiles: false
});
// At some point we need to toggle this setting based on some user input.
i18n.setLocale('en');

let languageTranslator;

let startupBegan;
let startupResult;
let startupPromises = [];
let LANGUAGE_NAME_TO_CODE;
let LANGUAGE_CODE_TO_NAME;
let TARGET_LANGUAGE_CODES;
let SOURCE_TO_TARGET_LANGUAGE_CODES;
let SOURCE_TARGET_MODEL_IDS;

function startup(robot, res) {
	if (startupResult) {
		if (_.isError(startupResult)) {
			return Promise.reject(startupResult);
		}
		else {
			return Promise.resolve(startupResult);
		}
	}

	function resolveAll(result) {
		if (_.isError(result)) {
			_.forEach(startupPromises, (promiseCallsbacks) => {
				promiseCallsbacks.reject(result);
			});
		}
		else {
			_.forEach(startupPromises, (promiseCallsbacks) => {
				promiseCallsbacks.resolve(result);
			});
		}
	}

	return new Promise((resolve, reject) => {
		startupPromises.push({
			resolve: resolve,
			reject: reject
		});

		if (!startupBegan) {
			startupBegan = true;
			robot.logger.debug('Language translation is initializing the languages');
			try {
				languageTranslator = watson.language_translator({
					url: HUBOT_WATSON_TRANSLATE_API,
					username: HUBOT_WATSON_TRANSLATE_USER,
					password: HUBOT_WATSON_TRANSLATE_PASSWORD,
					version: 'v2'
				});

				languageTranslator.getIdentifiableLanguages({}, function(identifiableLangError, identifiableBody) {
					if (identifiableLangError) {
						robot.logger.debug(i18n.__('translate.failed.to.load.languages'));
						startupResult = _.isError(identifiableLangError) ? identifiableLangError : new Error(identifiableLangError.error);
						robot.logger.error(startupResult);
						resolveAll(startupResult);
						return;
					}
					else {
						LANGUAGE_NAME_TO_CODE = {};
						LANGUAGE_CODE_TO_NAME = {};
						_.forEach(identifiableBody.languages, function(identLangEntry) {
							let languageName = identLangEntry.name.replace(' ', '-');
							LANGUAGE_NAME_TO_CODE[languageName.toLocaleLowerCase()] = identLangEntry.language.toLocaleLowerCase();
							LANGUAGE_CODE_TO_NAME[identLangEntry.language.toLocaleLowerCase()] = languageName;
						});
						languageTranslator.getModels({}, function(modelsError, modelsBody) {
							if (modelsError) {
								robot.logger.debug(i18n.__('translate.failed.to.load.models'));
								startupResult = _.isError(modelsError) ? modelsError : new Error(modelsError.error);
								robot.logger.error(startupResult);
								resolveAll(startupResult);
								return;
							}
							else {
								TARGET_LANGUAGE_CODES = [];
								SOURCE_TO_TARGET_LANGUAGE_CODES = {};
								SOURCE_TARGET_MODEL_IDS = {};
								_.forEach(modelsBody.models, function(modelEntry) {
									if (modelEntry.status === 'available' && modelEntry.domain === 'conversational') {
										let targetLocale = modelEntry.target.toLocaleLowerCase();
										let sourceLocale = modelEntry.source.toLocaleLowerCase();
										TARGET_LANGUAGE_CODES.push(modelEntry.target.toLocaleLowerCase());
										if (!SOURCE_TO_TARGET_LANGUAGE_CODES[sourceLocale]) {
											SOURCE_TO_TARGET_LANGUAGE_CODES[sourceLocale] = [];
										}
										SOURCE_TO_TARGET_LANGUAGE_CODES[sourceLocale].push(targetLocale);
										SOURCE_TARGET_MODEL_IDS[sourceLocale + '-' + targetLocale] = modelEntry.model_id;
									}
								});
								TARGET_LANGUAGE_CODES = _.uniq(TARGET_LANGUAGE_CODES);
								robot.logger.debug(i18n.__('translate.supported.languages.loaded'));
								robot.logger.debug(i18n.__('translate.target.languages.loaded', JSON.stringify(TARGET_LANGUAGE_CODES,
									null, 2)));
								robot.logger.debug(i18n.__('translate.source.languages.loaded', JSON.stringify(
									SOURCE_TO_TARGET_LANGUAGE_CODES,
									null,
									2)));
								robot.logger.debug(i18n.__('translate.models.loaded', JSON.stringify(
									SOURCE_TARGET_MODEL_IDS,
									null,
									2)));
								startupResult = true;
								resolveAll(startupResult);
							}
						});
					}
				});
			}
			catch (e) {
				startupResult = e;
				resolveAll(startupResult);
			}
		}
	});
}

function languageForCode(code) {
	let languageName = LANGUAGE_CODE_TO_NAME[code.toLocaleLowerCase()];
	languageName = languageName.replace('-', ' ');
	languageName = _.capitalize(languageName);
	return languageName;
}

function codeForLanguage(language) {
	let languageName = language.replace(' ', '-').toLocaleLowerCase();
	return LANGUAGE_NAME_TO_CODE[languageName];
}

function createPromptForLanguageSelection(context, languageChoices, promptDescription) {
	let languageString = '';
	let choiceArray = _.cloneDeep(languageChoices);
	choiceArray.push('None of the above');

	let count = 0;
	_.forEach(choiceArray, (language) => {
		languageString += ++count + '. ' + language + '\n';
	});

	let prompt = promptDescription + '\n' + languageString;

	const regex = createRangeRegEx(1, count);
	context.robot.logger.debug(`${TAG}: selection regex: ${regex}`);

	return utils.getExpectedResponse(context.res, context.robot, context.switchBoard, prompt, regex)
		.then((selectionRes) => {
			let selection = parseInt(selectionRes.match[1], 10) - 1;
			let selectedLanguage = choiceArray[selection];
			context.robot.logger.info(`${TAG}: Selected ${selectedLanguage} as the language.`);
			return codeForLanguage(selectedLanguage);
		});
}

function createRangeRegEx(start, end) {
	let pattern = '\\b(';
	let i;
	for (i = start; i < end; i++) {
		pattern += i + '|';
	}
	pattern += end + ')\\b';
	return new RegExp(pattern);
}

function validateTargetLanguage(context, translationInfo) {
	return new Promise((resolve, reject) => {
		let newTranslationInfo = _.cloneDeep(translationInfo);
		newTranslationInfo.targetLanguageLocale = codeForLanguage(newTranslationInfo.targetLanguage);

		let allTargetLanguages = _.map(TARGET_LANGUAGE_CODES, (code) => {
			return languageForCode(code);
		});

		function promptForTargetLanguage(languagesForPrompt) {
			createPromptForLanguageSelection(context, languagesForPrompt.sort(), i18n.__('translate.target.invalid',
					newTranslationInfo.targetLanguage))
				.then((languageResult) => {
					context.robot.logger.debug(`${TAG}: user selected ${languageResult}`);
					newTranslationInfo.targetLanguageLocale = languageResult;
					newTranslationInfo.targetLanguage = languageForCode(newTranslationInfo.targetLanguageLocale);
					context.robot.emit('ibmcloud.formatter', {
						response: context.res,
						message: i18n.__('translate.target.success', newTranslationInfo.targetLanguage)
					});
					resolve(newTranslationInfo);
				})
				.catch((languageResultError) => {
					reject(new Error(i18n.__('translate.target.unknown.error') + '  ' + buildSupportedLanguageMatrix()));
				});
		}

		if (newTranslationInfo.targetLanguageLocale) {
			newTranslationInfo.targetLanguage = languageForCode(newTranslationInfo.targetLanguageLocale);
			if (_.indexOf(TARGET_LANGUAGE_CODES, newTranslationInfo.targetLanguageLocale) === -1) {
				// Language is not a supported language.
				promptForTargetLanguage(allTargetLanguages);
			}
			else {
				resolve(newTranslationInfo);
			}
		}
		else {
			context.robot.logger.debug(`${TAG}: target language not found`);
			promptForTargetLanguage(allTargetLanguages);
			return;
		}
	});
}

function evaluateSourceLanguageDetectionConfidence(context, watsonLanguages, potentialSourceLanguageCodes) {
	if (!watsonLanguages || !watsonLanguages.languages) {
		return [];
	}

	let validWatsonLanguages = _.filter(watsonLanguages.languages, (language) => {
		return (_.indexOf(potentialSourceLanguageCodes, language.language) !== -1) || (language.language === 'en' &&
			language.confidence > CONFIDENCE_THRESHOLD);
	});

	if (validWatsonLanguages.length === 0) {
		return [];
	}

	if (validWatsonLanguages.length > 1) {
		context.robot.logger.debug('Candidate Languages and confidence levels: ');
		context.robot.logger.debug(validWatsonLanguages);
		let result = [];
		let previousEntry;
		_.forEach(validWatsonLanguages, (languageEntry) => {
			let shouldAdd = true;
			if (previousEntry) {
				if (languageEntry.confidence < CONFIDENCE_THRESHOLD)
					shouldAdd = false;
			}

			if (shouldAdd) {
				let locale = languageEntry.language;
				if (locale) {
					let language = languageForCode(locale);
					if (language) {
						result.push(language);
					}
				}
			}
			previousEntry = languageEntry;
		});
		return result;
	}
	else {
		// only one possible answer.
		let locale = validWatsonLanguages[0].language;
		if (locale) {
			let language = languageForCode(locale);
			if (language) {
				return [language];
			}
		}
		return [];
	}
}

function validateSourceLanguage(context, translationInfo) {
	return new Promise((resolve, reject) => {
		let newTranslationInfo = _.cloneDeep(translationInfo);

		let validSourceLanguageCodes = [];
		_.forEach(SOURCE_TO_TARGET_LANGUAGE_CODES, (targetLocaleSet, sourceLocaleKey) => {
			if (targetLocaleSet.indexOf(newTranslationInfo.targetLanguageLocale) !== -1) {
				validSourceLanguageCodes.push(sourceLocaleKey);
			}
		});

		validSourceLanguageCodes = _.uniq(validSourceLanguageCodes);

		let validSourceLanguages = _.map(validSourceLanguageCodes, (code) => {
			return languageForCode(code);
		});

		validSourceLanguages = validSourceLanguages.sort();

		function promptForSourceLanguage(languagesForPrompt, promptMessage) {
			createPromptForLanguageSelection(context, languagesForPrompt, promptMessage)
				.then((inputLanguageResult) => {
					context.robot.logger.debug(`${TAG}: user selected ${inputLanguageResult}`);
					newTranslationInfo.sourceLanguageLocale = inputLanguageResult;
					newTranslationInfo.sourceLanguage = languageForCode(newTranslationInfo.sourceLanguageLocale);
					context.robot.emit('ibmcloud.formatter', {
						response: context.res,
						message: i18n.__('translate.source.success', newTranslationInfo.sourceLanguage)
					});

					resolve(newTranslationInfo);
					return;
				})
				.catch((inputLanguageResultError) => {
					reject(new Error(i18n.__('translate.source.unknown.error') + '  ' + buildSupportedLanguageMatrix()));
					return;
				});

		}
		languageTranslator.identify({
			text: newTranslationInfo.phraseToTranslate
		}, function(error, watsonLanguageDetectionResult) {
			if (error) {
				//  Watson language detection hit error.
				context.robot.logger.error(`${TAG}: ' Watson failed to detect language.`, error);
				promptForSourceLanguage(validSourceLanguages, i18n.__('translate.source.invalid'));
				return;
			}
			else {
				let candidateLanguages = evaluateSourceLanguageDetectionConfidence(context, watsonLanguageDetectionResult,
					validSourceLanguageCodes);
				if (candidateLanguages.length === 1) {
					context.robot.logger.debug(`${TAG}: Watson found one potential language: ${candidateLanguages[0]}`);
					newTranslationInfo.sourceLanguage = candidateLanguages[0];
					newTranslationInfo.sourceLanguageLocale = codeForLanguage(newTranslationInfo.sourceLanguage);
					resolve(newTranslationInfo);
				}
				else {
					context.robot.logger.debug(`${TAG}: Watson found several potential languages: ${candidateLanguages}`);
					let watsonFoundPotentialMatches = candidateLanguages.length > 0;
					let promptSourceLanguages = watsonFoundPotentialMatches ? candidateLanguages : validSourceLanguages;
					let promptSourceMessage = watsonFoundPotentialMatches ? i18n.__('translate.source.watson.invalid') : i18n.__('translate.source.invalid');
					promptForSourceLanguage(promptSourceLanguages, promptSourceMessage);
					return;
				}
			}
		});
	});
}

function translatePhrase(context, translationInfo) {
	return new Promise((resolve, reject) => {
		let newTranslationInfo = _.cloneDeep(translationInfo);
		context.robot.emit('ibmcloud.formatter', {
			response: context.res,
			message: i18n.__('translate.phrase.info', newTranslationInfo.sourceLanguage, newTranslationInfo.targetLanguage)
		});

		if (newTranslationInfo.sourceLanguageLocale === newTranslationInfo.targetLanguageLocale) {
			context.robot.logger.debug(`${TAG}: sourceLanguage was the same as targetLanguage`);
			newTranslationInfo.translatedPhrase = newTranslationInfo.phraseToTranslate;
			newTranslationInfo.translationResponse = i18n.__('translate.phrase.output', newTranslationInfo.targetLanguage,
				newTranslationInfo.translatedPhrase, ' :)');
			resolve(newTranslationInfo);
			return;
		}
		else {
			languageTranslator.translate({
				text: newTranslationInfo.phraseToTranslate,
				model_id: SOURCE_TARGET_MODEL_IDS[newTranslationInfo.sourceLanguageLocale + '-' + newTranslationInfo.targetLanguageLocale]
			}, function(translateError, translationResult) {
				if (translateError) {
					context.robot.logger.error(`${TAG}: Watson failed to translate phrase.`, translateError);
					reject(new Error(i18n.__('translate.phrase.error')));
					return;
				}
				else {
					if (translationResult && translationResult.translations && translationResult.translations.length > 0 &&
						translationResult.translations[0].translation) {
						newTranslationInfo.translatedPhrase = translationResult.translations[0].translation;
						newTranslationInfo.translationResponse = i18n.__('translate.phrase.output', newTranslationInfo.targetLanguage,
							newTranslationInfo.translatedPhrase, '');
						resolve(newTranslationInfo);
						return;
					}
					else {
						context.robot.logger.debug(`${TAG}: Something went wrong.  Body: '` + JSON.stringify(translationResult,
							null,
							2));
						reject(new Error(i18n.__('translate.phrase.error')));
						return;
					}
				}
			});
		}
	});
}

function runTranslation(context, translationInfo) {
	context.robot.logger.debug('Starting translation: ' + JSON.stringify(translationInfo, null, 2));
	validateTargetLanguage(context, translationInfo)
		.then((newTranslationInfo) => {
			context.robot.logger.debug('Target language validated: ' + JSON.stringify(newTranslationInfo, null, 2));
			return validateSourceLanguage(context, newTranslationInfo);
		})
		.then((newTranslationInfo) => {
			context.robot.logger.debug('Source language validated: ' + JSON.stringify(newTranslationInfo, null, 2));
			return translatePhrase(context, newTranslationInfo);
		})
		.then((newTranslationInfo) => {
			context.robot.logger.debug('Watson translation complete: ' + JSON.stringify(newTranslationInfo, null, 2));
			context.robot.emit('ibmcloud.formatter', {
				response: context.res,
				message: newTranslationInfo.translationResponse
			});
			activity.emitBotActivity(context.robot, context.res, { activity_id: 'activity.translate.phrase'});
		})
		.catch((error) => {
			context.robot.logger.error(error.stack, error);
			context.robot.emit('ibmcloud.formatter', {
				response: context.res,
				message: error.message
			});
		});
}

function buildSupportedLanguageMatrix() {
	let supportString = i18n.__('translate.supported.languages') + '\n';
	_.forEach(SOURCE_TO_TARGET_LANGUAGE_CODES, (targetLanguageLocales, sourceLanguageLocale) => {
		let sourceLanguage = languageForCode(sourceLanguageLocale);
		let targetLanguages = _.map(targetLanguageLocales, (targetLanguageLocale) => {
			return languageForCode(targetLanguageLocale);
		});
		targetLanguages = targetLanguages.sort();
		supportString += sourceLanguage + ' -> ';
		_.forEach(targetLanguages, (targetLanguage) => {
			supportString += targetLanguage + ', ';
		});
		supportString = supportString.substring(0, supportString.length - 2) + '\n';
	});

	return supportString;
}

module.exports = (robot, res) => {
	const switchBoard = new Conversation(robot);

	const TRANSLATE_LIST_RE = /translate\slist\slanguages/i;
	const TRANSLATE_LIST_ID = 'translate.list';
	robot.on(TRANSLATE_LIST_ID, (res) => {
		robot.logger.debug(`${TAG}: ${TRANSLATE_LIST_ID} Natural Language match.`);
		translateList(res);
	});
	robot.respond(TRANSLATE_LIST_RE,
		{id: TRANSLATE_LIST_ID}, (res) => {
			robot.logger.debug(`${TAG}: ${TRANSLATE_LIST_ID} Reg Ex match.`);
			translateList(res);
		});
	function translateList(res){
		startup(robot)
			.then((startupResult) => {
				robot.emit('ibmcloud.formatter', {
					response: res,
					message: buildSupportedLanguageMatrix()
				});
				activity.emitBotActivity(robot, res, { activity_id: 'activity.translate.list'});
			})
			.catch((error) => {
				robot.logger.error(error);
				robot.emit('ibmcloud.formatter', {
					response: res,
					message: i18n.__('translate.startup.fail', error.message)
				});
			});
	};

	const TRANSLATE_PHRASE_RE = /translate\sphrase\s(\S+)\s(.*)/i;
	const TRANSLATE_PHRASE_ID = 'translate.phrase';
	robot.on(TRANSLATE_PHRASE_ID, (res, parameters) => {
		robot.logger.debug(`${TAG}: ${TRANSLATE_PHRASE_ID} Natural Language match.`);
		let targetLanguage;
		let phraseToTranslate;

		if (parameters && parameters.targetLanguage) {
			targetLanguage = parameters.targetLanguage;
		}
		else {
			robot.logger.error(`${TAG}: Error extracting Target Language from text=[${res.message.text}].`);
			let message = i18n.__('cognitive.parse.problem.targetLanguage');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
		if (parameters && parameters.phraseToTranslate) {
			phraseToTranslate = parameters.phraseToTranslate;
		}
		else {
			robot.logger.error(`${TAG}: Error extracting Phrase To Translate from text=[${res.message.text}].`);
			let message = i18n.__('cognitive.parse.problem.phraseToTranslate');
			robot.emit('ibmcloud.formatter', { response: res, message: message});
		}
		if (targetLanguage && phraseToTranslate){
			translatePhrase(res, targetLanguage, phraseToTranslate);
		}
	});
	robot.respond(TRANSLATE_PHRASE_RE,
		{id: TRANSLATE_PHRASE_ID}, (res) => {
			robot.logger.debug(`${TAG}: ${TRANSLATE_PHRASE_ID} Reg Ex match.`);
			const targetLanguage = res.match[1];
			const phraseToTranslate = res.match[2];
			translatePhrase(res, targetLanguage, phraseToTranslate);
		});
	function translatePhrase(res, targetLanguage, phraseToTranslate) {
		startup(robot, res)
			.then((startupResult) => {
				robot.logger.debug(
					`${TAG}: Target Language is '${targetLanguage}' and phraseToTranslate is '${phraseToTranslate}'`);
				if (!targetLanguage || !phraseToTranslate) {
					robot.emit('ibmcloud.formatter', {
						response: res,
						message: `${robot.name} translate phrase <language> <phrase> - ` + i18n.__('help.translate.phrase') + '\n'
					});
				}
				else if (phraseToTranslate.length > 500) {
					robot.emit('ibmcloud.formatter', {
						response: res,
						message: `${robot.name} translate phrase <language> <phrase> - ` + i18n.__('help.translate.phrase') + '\n'
					});
				}
				else {
					runTranslation({
						res: res,
						robot: robot,
						switchBoard: switchBoard
					}, {
						targetLanguage: targetLanguage,
						phraseToTranslate: phraseToTranslate
					});
				}
			})
			.catch((error) => {
				robot.logger.error(error);
				robot.emit('ibmcloud.formatter', {
					response: res,
					message: i18n.__('translate.startup.fail', error.message)
				});
			});
	};
};

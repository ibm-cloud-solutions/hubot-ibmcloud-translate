// Description:
//	Listens for commands to initiate actions against Bluemix for apps
//
// Configuration:
//	 HUBOT_BLUEMIX_API Bluemix API URL
//	 HUBOT_BLUEMIX_ORG Bluemix Organization
//	 HUBOT_BLUEMIX_SPACE Bluemix space
//	 HUBOT_BLUEMIX_USER Bluemix User ID
//	 HUBOT_BLUEMIX_PASSWORD Password for the Bluemix User
//
// Commands:
//   hubot translate help - Show available commands in the translate category.
//
// Author:
//	kholdaway
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

const TRANSLATE_HELP_RE = /translate+(|s)\s+help/i;
const TRANSLATE_HELP_ID = 'translate.help';
module.exports = (robot) => {

	robot.on(TRANSLATE_HELP_ID, (res) => {
		robot.logger.debug(`${TAG}: ${TRANSLATE_HELP_ID} Natural Language match.`);
		help(res);
	});
	robot.respond(TRANSLATE_HELP_RE, {
		id: TRANSLATE_HELP_ID
	}, function(res) {
		robot.logger.debug(`${TAG}: ${TRANSLATE_HELP_ID} Reg Ex match.`);
		help(res);
	});
	function help(res) {
		robot.logger.debug(`${TAG}: res.message.text=${res.message.text}.`);
		robot.logger.info('Listing help translate...');

		let help =
			`${robot.name} translate phrase [language] [phrase] - ` + i18n.__('help.translate.phrase') + '\n';
		help += `${robot.name} translate list languages - ` + i18n.__('help.translate.list') + '\n';

		robot.emit('ibmcloud.formatter', {
			response: res,
			message: '\n' + help
		});
	};
};

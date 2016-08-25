[![Build Status](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-translate.svg?branch=master)](https://travis-ci.org/ibm-cloud-solutions/hubot-ibmcloud-translate)
[![Coverage Status](https://coveralls.io/repos/github/ibm-cloud-solutions/hubot-ibmcloud-translate/badge.svg?branch=master)](https://coveralls.io/github/ibm-cloud-solutions/hubot-ibmcloud-translate?branch=master)
[![Dependency Status](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-translate/badge)](https://dependencyci.com/github/ibm-cloud-solutions/hubot-ibmcloud-translate)
[![npm](https://img.shields.io/npm/v/hubot-ibmcloud-translate.svg?maxAge=2592000)](https://www.npmjs.com/package/hubot-ibmcloud-translate)

# hubot-ibmcloud-translate

A Hubot script for translating messages with [IBM Watson Language Translation](https://console.ng.bluemix.net/catalog/services/language-translation/).

## Getting Started
* [Usage](#usage)
* [Commands](#commands)
* [Hubot Adapter Setup](#hubot-adapter-setup)
* [Cognitive Setup](#cognitive-setup)
* [Development](#development)
* [License](#license)
* [Contribute](#contribute)

## Usage

Steps for adding this to your existing hubot:

1. `cd` into your hubot directory
2. Install the Watson Translation functionality with `npm install hubot-ibmcloud-translate --save`
3. Add `hubot-ibmcloud-translate` to your `external-scripts.json`
4. Add the necessary environment variables:
```
export HUBOT_WATSON_TRANSLATE_API=WATSON
export HUBOT_WATSON_TRANSLATE_USER=<USERNAME>
export HUBOT_WATSON_TRANSLATE_PASSWORD=<PASSWORD>
```
_Note_: `HUBOT_WATSON_TRANSLATE_API` is optional.

5. Start up your bot & off to the races!

## Commands
- `hubot translate help` - Show available commands in the ibmcloud translate category.
- `hubot translate phrase <language> <phrase>` - Translate a phrase to a language.
- `hubot translate list languages` - Show available languages to use for translation.

## Hubot Adapter Setup

Hubot supports a variety of adapters to connect to popular chat clients.  For more feature rich experiences you can setup the following adapters:
- [Slack setup](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/docs/adapters/slack.md)
- [Facebook Messenger setup](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/docs/adapters/facebook.md)

## Cognitive Setup

This project supports natural language interactions using Watson and other Bluemix services.  For more information on enabling these features, refer to [Cognitive Setup](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-nlc/blob/master/docs/cognitiveSetup.md).

## Development

Please refer to the [CONTRIBUTING.md](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/CONTRIBUTING.md) before starting any work.  Steps for running this script for development purposes:

### Configuration Setup

1. Create `config` folder in root of this project.
2. Create `env` in the `config` folder, with the following contents:
```
export HUBOT_WATSON_TRANSLATE_API=WATSON
export HUBOT_WATSON_TRANSLATE_USER=<USERNAME>
export HUBOT_WATSON_TRANSLATE_PASSWORD=<PASSWORD>
```
_Note_: `HUBOT_WATSON_TRANSLATE_API` is optional.

3. In order to view content in chat clients you will need to add `hubot-ibmcloud-formatter` to your `external-scripts.json` file. Additionally, if you want to use `hubot-help` to make sure your command documentation is correct. Create `external-scripts.json` in the root of this project, with the following contents:
```
[
    "hubot-help",
    "hubot-ibmcloud-formatter"
]
```
4. Lastly, run `npm install` to obtain all the dependent node modules.

### Running Hubot with Adapters

Hubot supports a variety of adapters to connect to popular chat clients.

If you just want to use:
 - Terminal: run `npm run start`
 - [Slack: link to setup instructions](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/docs/adapters/slack.md)
 - [Facebook Messenger: link to setup instructions](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/docs/adapters/facebook.md)

## License

See [LICENSE.txt](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/LICENSE.txt) for license information.

## Contribute

Please check out our [Contribution Guidelines](https://github.com/ibm-cloud-solutions/hubot-ibmcloud-translate/blob/master/CONTRIBUTING.md) for detailed information on how you can lend a hand.

const fs = require('fs');
const { Translate } = require('@google-cloud/translate').v2;
const credentials = require('./creds.json');
require('dotenv').config()

const PATH = process.env.PATH_NAME || '';
const FILE_NAME = process.env.FILE_NAME || '';

run();

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function pushNewLanguage(content = {}, lan = 'en') {
  let PATH_FILE = `${PATH}${lan}.json`;
  let PATH_FILE_TEMP = `${PATH}${lan}Temp.json`;

  let fileLan = await fs.readFileSync(PATH_FILE);
  let fileLanArray =  fileLan.toString().split('\n');
  let fileLanJSON = JSON.parse(fileLan);
  let value = '';

  const { en = '', vn = '', jp = '', name = '' } = content;
  if (lan === 'en') value = en;
  if (lan === 'vn') value = vn;
  if (lan === 'jp') value = jp;

  if (fileLanJSON[name]) throw `Duplicate ${name}`;
  
  for (let pos = 0; pos < fileLanArray.length; pos++) {
    const line = fileLanArray[pos];
    if (
      (line === '}' && (pos + 2) === fileLanArray.length) ||
      (line === `}` && (pos + 1) === fileLanArray.length)
    ) {
      fs.appendFileSync(PATH_FILE_TEMP, "," + "\n" + `\t"${name}": "${value}"` + "\n" + line.toString());
    } else {
      if (pos === 0) {
        fs.appendFileSync(PATH_FILE_TEMP, line.toString());
      } else {
        fs.appendFileSync(PATH_FILE_TEMP, "\n" + line.toString());
      }
    }
  }

  fs.copyFileSync(PATH_FILE_TEMP, PATH_FILE);
  fs.unlinkSync(PATH_FILE_TEMP);

  return `language.${name}`;
}

async function removeLanguage(name = '', lan = 'en') {
  let PATH_FILE = `${PATH}${lan}.json`;
  let PATH_FILE_TEMP = `${PATH}${lan}Temp.json`;

  let fileLan = await fs.readFileSync(PATH_FILE);
  let fileLanArray =  fileLan.toString().split('\n');
  let fileLanJSON = JSON.parse(fileLan);
  let value = '';

  if (fileLanJSON[name]) {
    for (let pos = 0; pos < fileLanArray.length; pos++) {
      const line = fileLanArray[pos];
      if (line.toString().indexOf(name) === -1) {
        if (pos === 0) {
          fs.appendFileSync(PATH_FILE_TEMP, line.toString());
        } else {
          fs.appendFileSync(PATH_FILE_TEMP, "\n" + line.toString());
        }
      }
    }
  
    fs.copyFileSync(PATH_FILE_TEMP, PATH_FILE);
    fs.unlinkSync(PATH_FILE_TEMP);
  
    return `Remove success: language.${name}`;
  }
}

async function readFileAndConvert(pathName = '') {
  try {
    let fileRead = await fs.readFileSync(pathName);
    if (fileRead) return fileRead.toString().split('\n');
    else return [];
  } catch (error) {
    throw error;
  }
}

async function run() {
  try {
    const translate = new Translate({
      credentials: credentials,
      projectId: credentials.project_id
    });
    let changeWord = { target: '', convert: '' };
    let dataArray = await readFileAndConvert(`./${FILE_NAME}`);
    let result = [];

    if (dataArray[0].indexOf('*') !== -1) {
      let changeWordContent = dataArray[0];
      let changeWordArray = changeWordContent.replace('*', '').split('-');
      changeWord.target = changeWordArray[0].toLowerCase();
      changeWord.convert = changeWordArray[1].toLowerCase();
      dataArray.shift();
    }
    
    for (let pos = 0; pos < dataArray.length; pos++) {
      let vn = dataArray[pos];
      let [en] = await translate.translate(vn, 'en');
      let [jp] = await translate.translate(vn, 'ja');
      let name = en.trim().replace(/ /g, '_').toLowerCase();

      if (changeWord.target) {
        // Case Uppercase first letter
        name = name.replace(new RegExp(capitalizeFirstLetter(changeWord.target), 'g'), `${capitalizeFirstLetter(changeWord.convert)}`);
        en = en.replace(new RegExp(capitalizeFirstLetter(changeWord.target), 'g'), `${capitalizeFirstLetter(changeWord.convert)}`);

        // Case lowerCase 
        name = name.replace(new RegExp(changeWord.target, 'g'), `${changeWord.convert}`);
        en = en.replace(new RegExp(changeWord.target, 'g'), `${changeWord.convert}`);

        // Case upperCase 
        name = name.replace(new RegExp(changeWord.target.toUpperCase(), 'g'), `${changeWord.convert.toUpperCase()}`);
        en = en.replace(new RegExp(changeWord.target.toUpperCase(), 'g'), `${changeWord.convert.toUpperCase()}`);
      }

      result.push({
        en: en.trim(),
        jp: jp.trim(),
        vn: vn.trim(),
        name: name.trim(),
      })
    }

    for (let pos = 0; pos < result.length; pos++) {
      const word = result[pos];
      let successMessage = await pushNewLanguage(word, 'en');
      await pushNewLanguage(word, 'vn');
      await pushNewLanguage(word, 'jp');
      console.log(successMessage);
    }
  } catch (error) {
    console.log("Error", error);
  }
}

async function runExample(params) {
  try {
    let changeWord = { target: '', convert: '' };
    let dataArray = await readFileAndConvert(`./${FILE_NAME}`);
    let result = [];

    if (dataArray[0].indexOf('*') !== -1) {
      let changeWordContent = dataArray[0];
      let changeWordArray = changeWordContent.replace('*', '').split('-');
      changeWord.target = changeWordArray[0].toLowerCase();
      changeWord.convert = changeWordArray[1].toLowerCase();
      dataArray.shift();
    }

    for (let pos = 0; pos < dataArray.length; pos++) {
      const word = dataArray[pos];
      let successMessage = await removeLanguage(word, 'en');
      await removeLanguage(word, 'vn');
      await removeLanguage(word, 'jp');
      console.log(successMessage);
    }
  } catch (error) {
    console.log("Error", error);
  }
}




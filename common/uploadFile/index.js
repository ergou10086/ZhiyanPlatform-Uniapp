'use strict';

const cloud = require('wx-server-sdk');

cloud.init();

exports.main = async (event, context) => {
  try {
    // event.fileContent is expected to be base64 string
    const fileBuffer = Buffer.from(event.fileContent || '', 'base64');
    const res = await cloud.uploadFile({
      cloudPath: event.cloudPath,
      fileContent: fileBuffer
    });
    return res.fileID;
  } catch (e) {
    console.error(e);
    return null;
  }
};



const firebase = require("firebase");

const app = firebase.initializeApp({
	apiKey: "AIzaSyDCjDNPJT2o6UDAtzm3GgBRMDHcSWyxvKg",
	authDomain: "asmirror-80978.firebaseapp.com",
	databaseURL: "https://asmirror-80978-default-rtdb.firebaseio.com",
	projectId: "asmirror-80978",
	storageBucket: "asmirror-80978.appspot.com",
	messagingSenderId: "792126961423",
	appId: "1:792126961423:web:d6882234cec1eedffdf07a"
});

module.exports = app;
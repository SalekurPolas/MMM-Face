'use strict';

const NodeHelper = require('node_helper');
const fs = require('fs');
const https = require('https');
const { PythonShell } = require('python-shell');
const onExit = require('signal-exit');
const firebase = require('./res/library/firebase');
const shell = require('shelljs');
const nodemailer = require('nodemailer');
var pythonStarted = false;

module.exports = NodeHelper.create({
    pyshell: null,
    python_start: function() {
        const self = this;
        const options = {
            mode: 'json',
            stderrParser: line => JSON.stringify(line),
            args: [
                '--cascade=' + this.config.cascade,
                '--encodings=' + this.config.encodings,
                '--usePiCamera=' + this.config.usePiCamera,
                '--source=' + this.config.source,
                '--rotateCamera=' + this.config.rotateCamera,
                '--method=' + this.config.method,
                '--detectionMethod=' + this.config.detectionMethod,
                '--interval=' + this.config.checkInterval,
                '--dataset=' + this.config.dataset,
                '--tolerance=' + this.config.tolerance
            ],
        };

        // Start face reco script
        self.pyshell = new PythonShell('modules/' + self.name + '/tools/facerecognition.py', options);

        self.pyshell.on('message', function(message) {
            if (message.hasOwnProperty('status')) {
                console.log('[' + self.name + '] ' + message.status);
            }
            
            if (message.hasOwnProperty('user')) {
                console.log('[' + self.name + '] ' + "Face detected of " + message.user.uid);
                firebase.database().ref('Users/' + message.user.uid).on('value', (snapshot) => {
                    if(snapshot.exists()) {
                        const data = snapshot.val();
                        self.sendSocketNotification("GET_FIREBASE_DATA_RESULT", {result: true, name: data.name, image: data.profile_image});
                    } else {
                        self.sendSocketNotification("GET_FIREBASE_DATA_RESULT", {result: false, name: message.user.uid});
                    }
                });
            }
            
            if (message.hasOwnProperty('unknown')) {
                var imageName = message.unknown.image;
                var imagePath = __dirname + '/res/images/unknown/' + imageName;
                var userName = "Salekur Rahaman";
                var userEmail = "salekur9@gmail.com";
                var authEmail = "devbac.app@gmail.com";
                var authPass = "Maskura1";
                var fromEmail = "ASMirror <devbac.app@gmail.com>";
                var emailSubject = "Unknown Face Detected at ASMirror";
                var emailMessage = "We have detected an unknown face at your AI Smart Mirror. Please take a look at that person whether you are familiar with them.";

                // printing detected image name in log
                console.log('[' + self.name + '] ' + "Unknown detected at " + imageName);

                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: authEmail,
                        pass: authPass
                    }
                });

                const mailOptions = {
                    from: fromEmail,
                    to: userEmail,
                    subject: emailSubject,
                    html: `<p>Hi ${userName},<br>${emailMessage}</p>`,

                    attachments: [{
                        path: imagePath
                    }]
                };

                transporter.sendMail(mailOptions, function (err, info) {
                    if(err) {
                        // if there are any error occure on sending mail
                        console.log('[' + self.name + '] ' + "Nodemailer " + err);
                    } else {
                        console.log('[' + self.name + '] ' + "Nodemailer info: " + info.response);
                    }
                });
            }
        });

        // Shutdown node helper
        self.pyshell.end(function(err) {
            if (err) throw err;
            console.log('[' + self.name + '] ' + 'finished running...');
        });

        onExit(function(code, signal) {
            self.destroy();
        });
    },

    python_stop: function() {
        this.destroy();
    },

    destroy: function() {
        console.log('[' + this.name + '] ' + 'Terminate python');
        this.pyshell.childProcess.kill();
    },

    stop: function() {
        pythonStarted = false;
        this.python_stop();
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'CONFIG') {
            this.config = payload;
            if (!pythonStarted) {
                pythonStarted = true;
                this.python_start();
            }
        }

        if(notification === "CHECK_TRAIN_DATA") {
			var RootRef = firebase.database().ref();

			RootRef.child("Users").on('child_added', (snapshot) => {
				const key = snapshot.key;
				const data = snapshot.val();
				var path = "./modules/MMM-Face/dataset/" + key;

				try {
					if (!fs.existsSync(path)) {
						fs.mkdir(path, function(err) {
							if(err) {
								console.log("Error: " + err);
							}
						});
					}

					for(let i = 1; i < 6; i++) {
						if(snapshot.child("train_image").child("img0" + i).exists()) {
							try {
								fs.accessSync(path + "/img0" + i + ".jpg");
							} catch (err) {
								var ImageUrl = snapshot.child("train_image").child("img0" + i).val();

								https.get(ImageUrl, (res) => {
									var filePath = fs.createWriteStream(path + "/img0" + i + ".jpg");
									res.pipe(filePath);
									filePath.on('finish', () => {
										filePath.close();
										console.log("img0" + i + ".jpg downloded for UID: " + key);
									});
								});
							}
						}
					}
				} catch(e) {
					console.log("Error: " + e);
				}
			});

			RootRef.child("Users").on('child_changed', (snapshot) => {
				const key = snapshot.key;
				const data = snapshot.val();
			});

			RootRef.child("Users").on('child_removed', (snapshot) => {
				const key = snapshot.key;
				const data = snapshot.val();
			});

			var c1 = "cd ~/MagicMirror/modules/MMM-Face/tools/";
            var c2 = "python3 encode.py";
			var c3 = "make";

			shell.exec(c1 + ';' + c2 + ';' + c3, (code, output) => {
				this.sendSocketNotification("CHECK_TRAIN_DATA_RESULT", "Model Created");
			});
		}
    },
});
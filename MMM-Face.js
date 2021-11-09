'use strict';

Module.register('MMM-Face', {
    defaults: {
        dataset: 'modules/MMM-Face/dataset/',
        cascade: 'modules/MMM-Face/tools/haarcascade.xml',
        encodings: 'modules/MMM-Face/tools/encodings.pickle',
        usePiCamera: 1,
        source: 0,
        rotateCamera: 0,
        method: 'dnn',
        detectionMethod: 'hog',
        tolerance: 0.6,
        checkInterval: 5000,
        
        // var for layout
        userName: "User",
		userImage: "./modules/MMM-Face/res/images/User.jpg"
    },

	getDom: function() {
		var Wrapper = document.createElement("div");
		var UserName = document.createElement("span");
		var UserImage = document.createElement("img");
		
		Wrapper.className = "face";
		UserName.className = "animate__animated animate__pulse animate__infinite";
		UserImage.className = "face_user_image";

		UserName.innerHTML = this.config.userName;
		UserImage.src = this.config.userImage;

		if(this.config.userName === 'User') {
			Wrapper.style.display = 'none';
		} else {
			Wrapper.style.display = 'flex';
		}

		Wrapper.appendChild(UserName);
		Wrapper.appendChild(UserImage);
		return Wrapper;
	},

	getStyles: function () {
		return [this.file('res/css/style.css'), this.file('res/library/animate.css')];
	},

	getScripts: function() {
		return	['moment.js'];
	},

    notificationReceived: function(notification, payload, sender) {
        if (notification === 'DOM_OBJECTS_CREATED') {
            this.sendSocketNotification("CHECK_TRAIN_DATA", payload);
        }
    },

    socketNotificationReceived: function(notification, payload) {
        if(notification === "CHECK_TRAIN_DATA_RESULT") {
			this.sendNotification('SHOW_ALERT', {type: 'notification', title: "ASMirror", message: payload});
            this.sendSocketNotification('CONFIG', this.config);
            console.log('Starting module: ' + this.name);
		}

		if(notification === "GET_FIREBASE_DATA_RESULT") {
			if(payload.result) {
				this.config.userName = payload.name;
				this.config.userImage = payload.image;
                this.sendNotification('SHOW_ALERT', { type: 'notification', title: "ASMirror", message: "Welcome " + payload.name});
				this.updateDom();
			} else {
                this.config.userName = "User";
				this.config.userImage = this.file('res/images/User.jpg');
                this.sendNotification('SHOW_ALERT', { type: 'notification', title: "ASMirror", message: "Unknown data sent"});
				this.updateDom();
			}
		}
    },
});
Module.register("DailyXKCD",{

	// Default module config.
	defaults: {
		dailyJsonUrl : "http://xkcd.com/info.0.json",
		invertColors : false,
		onlyShowTodaysComic: false,
		updateTOD: 5, // Time of day to download new comic, 0-23 hours
		initialDelay: 10 * 1000 // 30 seconds. Initial heartbeat delay.
	},

	start: function() {
		Log.info("Starting module: " + this.name);

		this.dailyComic = "";
		this.dailyComicTitle = "";
		this.dailyComicAlt = "";
		this.dailyComicDate = moment({y:0,M:0,d:0});
		this.showComic = false;

		var now = moment();
		this.nextComicDownloadTime = moment([now.year(), now.month(), now.date() +1, this.config.updateTOD]); //Tomorrow at 5AM

		this.getComic(); // Retreive a comic right away on startup
		this.scheduleHeartbeat(moment().add(this.config.initialDelay,'ms'));
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	getComic: function() {
		Log.info("XKCD: Getting comic. SendSocketNotification GET_COMIC.");

		this.sendSocketNotification("GET_COMIC", {config: this.config});
	},

	socketNotificationReceived: function(notification, payload) {
		Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if(notification === "COMIC"){
				Log.info(payload.img);
				this.dailyComic = payload.img;
				this.dailyComicTitle = payload.safe_title;
				this.dailyComicAlt = payload.alt;
				this.dailyComicDate = moment({
					year: payload.year,
					month: payload.month -1,
					day: payload.day});
				this.showComic = this.config.onlyShowTodaysComic ? this.isComicFromToday() : true;
				this.updateDom(2000);
		}
	},

	isComicFromToday: function() {
		return this.dailyComicDate.isSame(moment(),'day');
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.showComic === true) {
			var title = document.createElement("div");
			title.className = "bright large light";
			title.innerHTML = this.dailyComicTitle;

			var xkcd = document.createElement("img");
			xkcd.src = this.dailyComic;
			if(this.config.invertColors){
				xkcd.setAttribute("style", "-webkit-filter: invert(100%);")
			}

			var alt = document.createElement("div");
			alt.className = "normal xsmall light";
			alt.innerHTML = this.dailyComicAlt;
			alt.style.maxWidth = "1000px";
			alt.style.margin = "auto";

			wrapper.appendChild(title);
			wrapper.appendChild(xkcd);
			wrapper.appendChild(alt);
			return wrapper;
		} else {
			return wrapper;
		}
	},

	scheduleHeartbeat: function(whenToCheck) {
		// Heartbeat to check if it is time to download new comic periodically

		// Calculate time until next beat
		var durationUntilNextCheck = moment.duration(whenToCheck.diff(moment()));
		Log.group('xkcd: scheduling heartbeat check for ' + durationUntilNextCheck.humanize(true) + ' from now.');
		Log.log('xkcd: Current time: ' + moment().toString());
		Log.log('xkcd: Time to check next: ' + whenToCheck.toString());
		Log.groupEnd();

		setTimeout(this.updateComic, durationUntilNextCheck, this);
	},

	updateComic: function(self) {
		// If it is time to download a new comic, do so.

		// This is only accessed as a callback function. Needs to have context specified.
		Log.log('xkcd: entering updateComic()');

		if (moment().isSameOrAfter(self.nextComicDownloadTime)) {
			Log.log('xkcd: Yes, go get comic');
			self.getComic()

			var now = moment();
			self.nextComicDownloadTime = moment([now.year(), now.month(), now.date() +1, self.config.updateTOD]); //Tomorrow at 5AM
		} else {
			Log.log('xkcd: Not ' + self.nextComicDownloadTime.toString() + ' yet, don\'t download new comic');
		}

		 // Check again one hour from now, on the hour.
		 // TODO: May need to re-evaluate if this is running correctly. For now, just log timestamps.
		var now = moment();
		var whenToCheckNext = moment([now.year(), now.month(), now.date(), now.hour() + 1]);
		self.scheduleHeartbeat(whenToCheckNext);
	}

});

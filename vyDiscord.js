(() => {
	const DISCORD_OAUTH2_BASE_URL = 'https://discordapp.com/api/oauth2/authorize';
	const DISCORD_OAUTH2_TOKEN_BASE_URL = 'https://discordapp.com/api/oauth2/token';
	const DISCORD_USERS_BASE_URL = 'https://discordapp.com/api/users/@me';
	const DISCORD_AVATAR_BASE_URL = 'https://cdn.discordapp.com/avatars/';
	const REDIRECT_URI = encodeURIComponent(window.location.href.replace('localhost', '127.0.0.1').split('?')[0]);
	// Discord images are by default a size of 128x128
	const DISCORD_IMAGE_WIDTH = 128;
	const DISCORD_IMAGE_HEIGHT = 128;

// #BEGIN CODE_EDIT
	const CLIENT_ID = '';
	const CLIENT_SECRET = '';
	// If you want this plugin to send a packet to the server with the data of the discord user. If this is set to true it will send a packet named `dAPI256` in which the data is the account info of the discord user
	// It will need to be parsed into an object server side
	const NETWORK = false;
// #END CODE_EDIT

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const image = new Image();
	// Allows crossOrigin images to be drawn onto a canvas
	image.crossOrigin = 'anonymous';
	// Preset the canvas to the default discord image size of 128x128
	canvas.width = DISCORD_IMAGE_WIDTH;
	canvas.height = DISCORD_IMAGE_HEIGHT;
	
	class VYDiscordUser {
		constructor(pUserObject){
			this.userObject = pUserObject;
		}

		// UserObject.id https://discord.com/developers/docs/resources/user#user-object
		getID() {
			return this.userObject.id;
		}

		// UserObject.premium_type https://discord.com/developers/docs/resources/user#user-object
		getUserName() {
			return this.userObject.username;
		}

		// UserObject.avatar https://discord.com/developers/docs/resources/user#user-object
		getAvatar() {
			return this.userObject.avatar;
		}

		// UserObject.banner_color https://discord.com/developers/docs/resources/user#user-object
		getBanner() {
			return this.userObject.banner_color;
		}

		// UserObject.banner_color https://discord.com/developers/docs/resources/user#user-object
		getBannerColor() {
			return this.userObject.banner_color;
		}

		// UserObject.accent_color https://discord.com/developers/docs/resources/user#user-object
		getAccentColor() {
			return this.userObject.accent_color;
		}

		// UserObject.premium_type https://discord.com/developers/docs/resources/user#user-object
		getNitro() {
			// 0: None
			// 1: Nitro Classic
			// 2: Nitro
			return this.userObject.premium_type;
		}

		// UserObject.mfa_enabled https://discord.com/developers/docs/resources/user#user-object
		get2FA() {
			return this.userObject.mfa_enabled;
		}
		// UserObject.discriminator https://discord.com/developers/docs/resources/user#user-object
		getTag() {
			return this.userObject.discriminator;
		}

		getPublicFlags() {
			return this.userObject.public_flags;
		}

		// UserObject.bot https://discord.com/developers/docs/resources/user#user-object
		isBot() {
			return this.userObject.bot;
		}

		// UserObject.bot https://discord.com/developers/docs/resources/user#user-object
		isVerfied() {
			return this.userObject.verified;
		}

		// Converts the user's discord avatar to a dataURL
		avatarToBase64(pWidth, pHeight, pCallback) {
			image.src = DISCORD_AVATAR_BASE_URL + this.getID() + '/' + this.getAvatar();
			canvas.width = pWidth;
			canvas.height = pHeight;
			image.addEventListener('load', (e) => {
				// Draw the avatar
				ctx.drawImage(image, 0, 0, pWidth, pHeight);
				// Get the base64 image of the avatar that was drawn
				const dataURL = canvas.toDataURL();
				// Clear the canvas for the next draw
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				canvas.width = DISCORD_IMAGE_WIDTH;
				canvas.height = DISCORD_IMAGE_HEIGHT;
				pCallback(dataURL, pWidth, pHeight);
			});
		}

		// Creates a icon for this Discord Users avatar image
		createDiscordAvii(pWidth=128, pHeight=128, pCallback) {
			const self = this;
			this.avatarToBase64(pWidth, pHeight, (pDataURL, pWidth, pHeight) => {
				const id = self.getID();
				if (VYLO) VYLO.Icon.newAtlas(id);
				if (VYLO) VYLO.Icon.newIcon(id, 'avii', pWidth, pHeight);
				if (VYLO) VYLO.Icon.setDataURL(pDataURL, id, 'avii', null, null, pCallback);				
			});
		}
	}

	class VYDiscordHandler {
		// Get the parameters from the URL
		getURIParams() {
			// Split the URL into two parts, the link and the parameters
			// Grab the parameters and create a URLSearchParam object
			const currentURL = window.location.href.split('?')[1];
			const searchParams = new URLSearchParams(currentURL);
			return searchParams;
		}

		login() {
			// If there is a code in the URL, this means we have visited the auth page and obtained it
			// We can now use this code to get the user token
			if (this.getCode()) {
				this.grabUserToken();
			// If there is no code then we need to go to the auth page to get one
			} else {
				// Move to the auth page to get the code that will be exchanged for a user token
				// When code is grabbed, it will redirect the client to the game client again and it will have the token as a param in the URL
				window.location.assign(DISCORD_OAUTH2_BASE_URL + '?client_id=' + CLIENT_ID + '&redirect_uri=' + REDIRECT_URI + '&response_type=code&scope=identify&prompt=none');
			}
		}

		// Gets the code that was returned so that it can be turned into a user access token
		getCode() {
			const code = this.getURIParams().get('code');
			return code;
		}

		grabDiscordUser(pToken) {
			const xhttp = new XMLHttpRequest();
			const xhrData = {
				'Bearer': pToken.access_token
			};

			xhttp.open('GET', DISCORD_USERS_BASE_URL, true);
			xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhttp.setRequestHeader('Authorization', 'Bearer ' + pToken.access_token);
			xhttp.send(xhrData);

			xhttp.onloadend = () => {
				const userObject = JSON.parse(xhttp.responseText);
				const DiscordUser = new VYDiscordUser(userObject);
				window.DiscordUser = DiscordUser;
				if (VYLO) VYLO.Client.DiscordUser = DiscordUser;
				if (VYLO) VYLO.global.DiscordUser = DiscordUser;
				if (NETWORK) {
					this.sendUserToServer();
				}
			};
		}

		grabUserToken() {
			// The current URL of the game server minus any URL parameters
			const code = this.getCode();
			const xhttp = new XMLHttpRequest();
			const xhrData = 'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&redirect_uri=' + REDIRECT_URI + '&code=' + code + '&scope=identify&grant_type=authorization_code';

			// Remove the parameters from the URL, incase of a refresh so it doesn't try to reload the user with the same token
			window.history.replaceState(null, null, window.location.pathname);

			xhttp.open('POST', DISCORD_OAUTH2_TOKEN_BASE_URL, true);
			xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhttp.send(xhrData);

			xhttp.onloadend = () => {
				const token = JSON.parse(xhttp.responseText);
				this.grabDiscordUser(token);
			};
		}

		// If networking is enabled, then this will send a packet to the server with the discord user data 
		sendUserToServer() {
			if (VYLO) VYLO.Client.sendPacket('dAPI256', JSON.stringify(VYLO.Client.DiscordUser));
		}
	}

	const DiscordHandler = new VYDiscordHandler();
	window.DiscordHandler = DiscordHandler;
	if (VYLO) VYLO.global.DiscordHandler = DiscordHandler;

	DiscordHandler.login();

})();
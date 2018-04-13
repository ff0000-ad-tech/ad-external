/**
	@npmpackage
	@class Device
	@desc
		Import from <a href="https://github.com/ff0000-ad-tech/ad-external">ad-external</a>
		<br>
		<codeblock>
			// importing into an ES6 class
			import { Device } from 'ad-external'
		</codeblock>
		<br><br>
		
		Global constant that provide information about the Device on which the code is currently executing
*/

class Device {
	static pixelRatio = window.devicePixelRatio || 'unknown'

	/**	
		@memberOf Device	
		@var {string} agentString
		@desc
			Current user agent of browser. */

	/**	
		@memberOf Device	
		@var {string} brand
		@desc
			Brand of device, possible values are: 
			<code>microsoft</code>, 
			<code>apple</code>, 
			<code>android</code>, 
			<code>rim</code>, 
			<code>unknown</code>. 
	*/

	/**	
		@memberOf Device	
		@var {string} product
		@desc
			Brand subtype, possible values are: 
			<code>windows phone</code>, 
			<code>windows</code>, 
			<code>iphone</code>, 
			<code>ipad</code>, 
			<code>ipod</code>, 
			<code>mac</code>, 
			<code>android</code>, 
			<code>pixel 2</code>, 
			<code>blackberry</code>. 
		*/

	/**	
		@memberOf Device	
		@var {string} type
		@desc
			Device type, possible values are: 
			<code>mobile</code>, 
			<code>tablet</code>, 
			<code>desktop</code>. 
			<br><br>
			Windows > 8 currently returns tablet, currently no way to differentiate from desktop. */

	/**	
		@memberOf Device	
		@var {string} os
		@desc
			Operating system of device. */

	/**	
		@memberOf Device	
		@var {string} osVersion
		@desc
			Version of operating system of device. */

	/** 	
		@memberOf Device	
		@var {string} browser
		@desc
			Brand of browser. */

	/**	
		@memberOf Device	
		@var {string} browserVersion
		@desc
			Version of browser. 
	*/

	/**	
		@memberOf Device	
		@var {string} pixelRatio
		@desc
			Pixel ratio of device viewport. 
	*/

	/** ------------------------------------------------------------------------------------------------------------- */
	// GETTERS

	/**	
		@memberOf Device	
		@var {string} orientation
		@desc
			Orientaion of device viewport: landscape or portrait. 
	*/
	static get orientation() {
		return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
	}

	/**	
		@memberOf Device	
		@var {object} dimensions
		@property {number} width
			window inner-width
		@property {number} height
			window inner-height
		@desc
			The current dimensions of the device's viewport, returns an object with a width and height 
			value that are direct returns of windowWidth and windowHeight.
	*/
	static get dimensions() {
		return {
			width: window.innerWidth,
			height: window.innerHeight
		}
	}

	/** ------------------------------------------------------------------------------------------------------------- */
	// PUBLIC METHODS

	/**	
		@memberOf Device	
		@method init
		@desc
			Initializes the module, which is called from within the pipeline.
	*/
	static init = function() {
		console.log('Device.init()')
		const D = this
		D.agentString = navigator.userAgent

		D._getType()
		D._getBrandAndOS()
		D._getBrowser()

		if (D.type !== 'desktop' && D.os === 'windows' && D.osVersion <= 8 && D.browser === 'ie' && D.browserVersion < 12) {
			console.log(
				"You appear to be on Windows 7 or 8 using Internet Explorer 11 or under. You also appear to be on a touchscreen device. We will assume you're actually on a desktop, since it's extremely unlikely you're on a tablet or mobile device using this specific operating system and browser."
			)
			D.type = 'desktop'
		}

		var line = Array(70).join('-')
		var str = '\n' + line
		// str += '\n AGENT:\n\n\t' + D.agentString + '\n'
		// str += '\n  Brand:\t\t\t' + D.brand
		// str += '\n  Product:\t\t\t' + D.product
		// str += '\n  Type:\t\t\t\t' + D.type
		// str += '\n  Os:\t\t\t\t' + D.os + ' - ' + D.osVersion
		// str += '\n  Browser:\t\t\t' + D.browser + ' - ' + D.browserVersion
		// str += '\n  Dimensions: \t\t' + D.dimensions.width + 'x' + D.dimensions.height
		// str += '\n  Orientation:\t\t' + D.orientation
		// str += '\n  Pixel Ratio:\t\t' + D.pixelRatio
		for (var property in D) {
			if (D.hasOwnProperty(property) && typeof D[property] !== 'function') {
				str += '\n' + property + ': ' + D[property]
			}
		}
		str += '\n' + line
		console.log(str)
	}

	/** ------------------------------------------------------------------------------------------------------------- */
	// PRIVATE METHODS
	static _getType = function() {
		const D = this
		var hasMobile = /(android|mobile)/gi.exec(D.agentString)
		var hasTablet = /(tablet|touch)/gi.exec(D.agentString)
		var hasIPad = /(ipad)/gi.exec(D.agentString)
		D.type = 'desktop'
		if (hasMobile) D.type = 'mobile'
		if (hasTablet) D.type = 'tablet'
		if (hasIPad) D.type = 'tablet'
	}

	static _getBrandAndOS = function() {
		var D = this
		var apple = D.agentString.match(/ip(hone|od|ad)|mac/gi)
		if (apple) {
			D.brand = 'apple'
			D.product = apple[0].toLowerCase()
			var appleOS = /(OS\s)(\X\s|)([\d\.\_]+)/gi.exec(D.agentString)
			D.os = appleOS[2] == '' ? 'ios' : 'osx'
			D.osVersion = appleOS[3].replace(/\_/g, '.')
			return
		}

		var android = /(android)\/?\s*([0-9\.]+)/gi.exec(D.agentString)
		if (android) {
			D.brand = D.product = D.os = android[1].toLowerCase()
			D._checkForSpecial('product', ['pixel 2'], D.agentString.split('(')[1].split(')')[0])
			D.osVersion = android[2]
			return
		}

		var microsoft = /(windows\snt\s|windows\sphone)\/?\s*([0-9\.]+)/gi.exec(D.agentString)
		if (microsoft) {
			D.brand = 'microsoft'
			D.os = 'windows'

			switch (microsoft[2]) {
				case '5.2':
					D.osVersion = 'xp'
					break
				case '6.0':
					D.osVersion = 'vista'
					break
				case '6.1':
					D.osVersion = '7'
					break
				case '6.2':
					D.osVersion = '8'
					break
				case '6.3':
					D.osVersion = '8.1'
					break
				case '10.0':
					D.osVersion = '10'
					break
				default:
					D.osVersion = microsoft[2]
			}

			D.product = microsoft[1].toLowerCase()
			if (D.product.match(/\snt/i)) {
				D.product = 'pc'
			}
			return
		}

		// blackberry
		var blackberry = D.agentString.match(/(blackberry|bb10|playbook)/i)
		if (blackberry) {
			D.brand = D.product = D.os = 'blackberry'
			D.osVersion = /(version)\/?\s*([0-9\.]+)/gi.exec(D.agentString)[2]
		}
	}

	static _getBrowser = function() {
		const D = this
		var browserMatches = /(edge(?=\/))\/?\s*([0-9\.]+)/i.exec(D.agentString) // check for edge first

		// if it's not edge, check for other common browsers
		if (!browserMatches) {
			browserMatches = D.agentString.match(/(fban|fbav|opera|chrome|crios|safari|firefox|msie|trident(?=\/))\/?\s*([0-9\.]+)/i)
		}

		// if we checked for common browsers and got NOTHING in return, let's just use the device's default browser
		if (!browserMatches || browserMatches.length < 3) {
			console.log('we received no browser data, so we are setting it to the default of the device')
			switch (D.os) {
				case 'ios':
					D.browser = 'safari'
					break
				case 'windows':
					D.browser = 'trident'
					break
				default:
					D.browser = 'chrome'
					break
			}
			D.browserVersion = 'os-default'
			return
		}

		console.log('we received browser data')
		D.browser = browserMatches[1].toLowerCase()
		D.browserVersion = browserMatches[2]

		switch (D.browser) {
			case 'trident':
				// Check for desktop IE 10
				var versionMatch = /\brv:+(\d+)/g.exec(D.agentString)
				if (versionMatch) D.browserVersion = versionMatch[1]
			case 'msie':
				D.browser = 'ie'
				break
			case 'crios':
				D.browser = 'chrome'
				break
			case 'safari':
				var versionMatch = D.agentString.match(/\sversion\/([0-9\.]+)\s/i)
				if (versionMatch) D.browserVersion = versionMatch[1]
				break
			case 'chrome':
				// check for Opera
				var versionMatch = D.agentString.match(/\b(OPR)\/([0-9\.]+)/i)
				if (versionMatch) {
					D.browser = 'opera'
					D.browserVersion = versionMatch[2]
				}
				break
		}
	}

	static _checkForSpecial = function(targetParam, array, focus) {
		const D = this
		var param
		for (var i = 0; i < array.length; i++) {
			param = array[i].toLowerCase()
			if (focus.match(new RegExp(param, 'i'))) {
				D[targetParam] = param
				break
			}
		}
	}
}

export default Device

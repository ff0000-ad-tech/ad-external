/**
	@class	AdManager
	@static
	@desc
		This object is meant to handle all of our json loading and parsing.
*/
import { NetUtils } from 'ad-utils'
import Loader from 'ad-load'
import { DateUtils } from 'ad-legacy'

var AdManager = new function() {

	var self = this;
	
	self.currentJsonData;

	self.adManagerSettings;

	self.jsonUrl;
	self.jsonMode;
	self.currentAdDataIndex = 0;
	self.completeCallback;



	/** 
		@memberOf AdManager
		@method init
		@param {object} 		_adManagerSettings 		- see "Properties" for more information
		@property {string} 		jsonMapUrl 			- the url on which to request a map.json
		@property {object} 		includeJsonDataByKey	- used to override the standard select-json-by-latest-non-expired method, and return
		@desc
			This passes the settings object from parent scope and initialized the class.
													the ad-data block whose specified key:value matches this param. 
	*/
	self.init = function( _adManagerSettings ) {
		self.adManagerSettings = _adManagerSettings;
	}





	/** 
		@memberOf AdManager
		@method isPreviewLocation
		@description
			This method returns true for all the locations that should load PREVIEW.JSON instead of published.json.
			Safeguards are in place so that even an ad in a staging/build-state will load published json, if running in 
			any http(s) locations other than the ones listed. 
	*/
	self.isPreviewLocation = function() {
		var href = window.location.href;
		if( href == undefined || href == null )
			return false;
		// local locations
		if( href.match( /^file/ ) || 
			adParams.environmentId == 'staging' || 
			adParams.environmentId == 'default' ||
			href.match( /ff0000\.com/ ) ||
			href.match( /adprodtest/ ) ||
			href.match( /client\-projects\.com/ ) || 
			href.match( /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+/ )
		) return true;
			
		// other locations
		return false;
	}







	// prepare json
	self.prepareJson = function( _completeCallback ) {
		console.log( 'AdManager.prepareJson()' );
		self.completeCallback = _completeCallback;

		var externalJson = NetUtils.getQueryParameterBy( 'jsonData' );
		var externalJsonUrl = NetUtils.getQueryParameterBy( 'jsonURL' );

		if( externalJson ) {
			console.log( ' - json data provided by query string' );
			externalJson = decodeURIComponent( externalJson );
			self.currentJsonData = self.parseJson( externalJson );
			self.handleJsonParseComplete();
		}
		else if( externalJsonUrl ) {
			console.log( ' - json url provided by query string' );
			self.jsonUrl = externalJsonUrl;
			self.loadJson();
		}
		else {
			self.loadMapJson();
		}
	}



	// get next ad data
	self.getNextAdData = function() {
		self.currentAdDataIndex++;
		console.log( '   getNextAdData() - new index: ' + self.currentAdDataIndex );

		global.adData = null;
		global.adParams.currentJsonData = null;
		global.adParams.currentJsonData = self.parseJson( global.adParams.rawJsonData, self.currentAdDataIndex );

		if ( global.adParams.currentJsonData ) {
			self.completeCallback.call();
		} 
		else {
			console.log( '                    No AdData left!!');
			global.failAd();
		}
	}







	// load map json
	self.loadMapJson = function() {
		console.log( 'PrepareCore.loadMapJson()' );
		var mapJsonLoader = new Loader( self.adManagerSettings.jsonMapUrl, { 
			name: 'mapJsonLoader', 
			onComplete: self.loadJsonMapComplete,
			onFail: global.failAd, 
			scope: self,
			fileType: 'json'
		});
		
		mapJsonLoader.load();
	}
	self.loadJsonMapComplete = function( target ) {
		console.log( 'AdManager.loadJsonMapComplete()' );
		var mapJson = JSON.parse( target.content[0].dataRaw );
		console.log( ' - map json: ', mapJson );

		if( self.isPreviewLocation() ) {
			console.log( '   LOADING PREVIEW JSON' );
			self.jsonUrl = mapJson.preview.json_url;
		
		} 
		else if( global.adParams.networkId == 'ESPN_ON_CHANNEL' ) {
			console.log( '   LOADING LIVE ON CHANNEL JSON' );
			self.jsonUrl = mapJson.published.on_channel.json_url;
		
		} 
		else {
			console.log( '   LOADING LIVE OFF CHANNEL JSON' );
			self.jsonUrl = mapJson.published.off_channel.json_url;
		}
		self.loadJson();
	}


	// load json data
	self.loadJson = function() {
		console.log( 'AdManager.loadJson()' );
		var jsonLoader = new Loader( self.jsonUrl, { 
			name: 'jsonLoader', 
			onComplete: self.handleJsonLoaded, 
			onFail: global.failAd, 
			cacheBuster: true,
			scope: self,
			fileType: 'json'
		});
		jsonLoader.load();
	}
	self.handleJsonLoaded = function( target ) {
		console.log( 'AdManager.handleJsonLoaded()' )
		global.adParams.rawJsonData = target.content[0].dataRaw;
		global.adParams.currentJsonData = self.parseJson( target.content[0].dataRaw );
		self.handleJsonParseComplete();
	}


	self.handleJsonParseComplete = function() {
		console.log( 'AdManager.handleJsonParseComplete()' );
		if( global.adParams.currentJsonData === false ) {
			console.log( '  JSON LOADED BUT ALL AD DATA IS EXPIRED');
			global.failAd();
		
		}
		else if( global.adParams.currentJsonData === 'pending' ) {
			console.log( '  JSON LOADED BUT NO AD DATA REMAINING AFTER ATTEMPTING TO FILTER BY KEY - GETTING NEXT AD DATA' );
			self.getNextAdData();
		}
		else {
			self.completeCallback.call();
		}
	}




	self.parseJson = function( _rawJsonData, returnIndex ) {
		console.log( 'AdManager.parseJson()' );

		returnIndex = returnIndex ? returnIndex : 0;

		var jsonData;
		var adDataArray = [];
		var dateSortedAdArray = [];

		var parsedJsonData = JSON.parse( _rawJsonData );
		if( parsedJsonData.length === undefined ) jsonData = [ parsedJsonData ];
		else jsonData = parsedJsonData;

		self.determineJsonMode( jsonData );

		if( self.jsonMode === 'timeslot' ) 
			jsonData = [ self.getAdDataFromTimeslot( jsonData ) ];
		else if( self.adManagerSettings.includeJsonDataByKey.key.length !== 0 ) {
			jsonData = self.includeAdDataByKey( jsonData, 'ads' );
		}

		if( jsonData[0] === 'pending' ) return jsonData[0];
		else if( !jsonData[0] ) return false;
		else if ( !jsonData ) return false;

		var hasExpiration = true;
		for( var prop in jsonData ) {
			if( jsonData[prop].expiration_time ) {
				var expiration_time = DateUtils.parseToDate( jsonData[prop].expiration_time );
				if( expiration_time.getTime() > self.getNow().getTime()) {
					if( !self.hasExcludedKeyValue( jsonData[prop] ) )
						adDataArray.push( jsonData[prop] );
				}
			}
			else {
				hasExpiration = false;
				adDataArray.push( jsonData[prop] );
			}
		}
		if( hasExpiration )
			dateSortedAdArray = adDataArray.sort( sortByExpirationDate );
		else dateSortedAdArray = adDataArray;

		function sortByExpirationDate( a, b ) {
			var aa = DateUtils.parseToDate( a.expiration_time ).getTime();
			var bb = DateUtils.parseToDate( b.expiration_time ).getTime();
			return ( aa < bb ) ? -1 : ( aa > bb ) ? 1 : 0;
		}

		if( returnIndex >= dateSortedAdArray.length ) return false;
		else return dateSortedAdArray[ returnIndex ];
	}

	self.determineJsonMode = function( _jsonData ) {
		console.log( 'AdManager.determineJsonMode()' );

		if( !_jsonData[0] ){
			console.log( '          - JSON is undefined from Ad Manager' );
			global.failAd();
			return;
		}

		if( !_jsonData[0].data_type ) {
			console.log( '          - JSON_MODE cannot be determined because no "data_type" node was found' );
			jsonMode = 'ads';
			return;
		}
		
		switch( _jsonData[0].data_type ) {
			case 'static':
				console.log( '          - JSON_MODE is set to STATIC' );
				self.jsonMode = 'static';
				break;
				
			case 'paramount':
				console.log( '          - JSON_MODE is set to PARAMOUNT' );
				self.jsonMode = 'paramount';
				break;
		
			case 'timeslot':
				console.log( '          - JSON_MODE is set to TIMESLOTS' );
				self.jsonMode = 'timeslot';
				break;
				
			default:
				console.log( '          - JSON_MODE is set to ADS' );
				self.jsonMode = 'ads';
				break;
		}
	}






	self.getAdDataFromTimeslot = function( rawTimeslotData ) {
		console.log( 'AdManager.getAdDataFromTimeslot()' );
		var adDataArray = [];
		for( var prop in rawTimeslotData ) {
			var currentTimeslot = rawTimeslotData[ prop ];
			var expiration_time = DateUtils.parseToDate( currentTimeslot.expiration_time );
			if( expiration_time.getTime() > self.getNow().getTime()) {
				adDataArray.push( currentTimeslot );
			}
		}
		if( adDataArray.length < 1 ) return false;

		if( self.adManagerSettings.includeJsonDataByKey.key.length !== 0 ) {
			adDataArray = self.includeAdDataByKey( adDataArray, 'timeslots' );
			if( adDataArray === 'pending' || !adDataArray ) 
				return adDataArray;
			else return self.getAdByWeight( adDataArray );
		}
		else {
			var prunedAds = [];
			for( var i in adDataArray[ 0 ].ads ) {
				if( !self.hasExcludedKeyValue( adDataArray[ 0 ].ads[i] ))
					prunedAds.push( adDataArray[ 0 ].ads[i] );
			}
			return self.getAdByWeight( prunedAds );
		}
	}

	self.getAdByWeight = function( adsArray ) {
		console.log( 'AdManager.getAdByWeight()' );
		// check individual ads in timeslot for expiration, and if expired, distribute the expired ad's weight evenly to others
		var expiredWeight = 0;
		for( var k = adsArray.length-1; k > -1; k-- ) {
			if( 'expiration_time' in adsArray[ k ] ) {
				var expiration_time = DateUtils.parseToDate( adsArray[ k ].expiration_time );
				if( expiration_time.getTime() < self.getNow().getTime()) {
					console.log( ' - ad "' + adsArray[ k ].name + '" expired: ' + adsArray[ k ].expiration_time + ', distributing ' + adsArray[ k ].weight + '% of weight to other ads' );
					expiredWeight += adsArray[ k ].weight;
					adsArray.splice( k, 1 );
				}				
			}
		}
		var adjustedWeight = expiredWeight / adsArray.length;
		var weightedIndexes = [];
		for( var i = 0; i < adsArray.length;  i++ ) {
			for( var j = 0; j < Math.round( adsArray[ i ].weight + adjustedWeight ); j++ ) {
				weightedIndexes.push( i );
			}
		}
		return adsArray[ weightedIndexes[ Math.floor( Math.random() * weightedIndexes.length ) ]];
	}





	self.includeAdDataByKey = function( adArray, type ) {
		console.log( 'AdManager.includeAdDataByKey()' );
		console.log( ' - Searching feed for a key: "' + self.adManagerSettings.includeJsonDataByKey.key + '" ' +
				'with values matching:' + self.adManagerSettings.includeJsonDataByKey.values.map( function( value ) { return '"' + value + '"'; }).join( ', ' ) );

		var keys = self.adManagerSettings.includeJsonDataByKey.key.split( '.' )

		var adsWithKey = [];
		var ads;
		if( adArray[ self.currentAdDataIndex ] !== undefined ) {
			if( type === 'timeslots' ) 
				ads = adArray[ self.currentAdDataIndex ].ads;
			else if( type === 'ads' ) 
				ads = adArray;
		}
		else return false;

		for( var i in ads ) {
			// generate path to requested key
			var jsonScope = ads[ i ];
			for( var k in keys ) {
				if( keys[ k ] in jsonScope )
					jsonScope = jsonScope[ keys[ k ] ];
				else {
					console.log( '   !!! invalid key path: "' + self.adManagerSettings.includeJsonDataByKey.key + '" !!!' );
					return false;
				}
			}
			for( var j in self.adManagerSettings.includeJsonDataByKey.values ) {
				if( jsonScope === self.adManagerSettings.includeJsonDataByKey.values[ j ] ) {
					adsWithKey.push( ads[ i ] );
				}
			}
		}
		if( adsWithKey.length > 0 ) {
			console.log( '   USING MATCHED AD-DATA~' );
			return adsWithKey;
		}
		else {
			console.log( '   !!! ads with matched keys were NOT found !!!' );
			if( type === 'timeslots' ) return 'pending';
			else if( type === 'ads' ) return false;
		}
	}  


	self.hasExcludedKeyValue = function( adData ) {
		if( self.adManagerSettings.excludeJsonDataByKey ) {
			if( self.adManagerSettings.excludeJsonDataByKey.key in adData ) {
				for( var j = 0; j < self.adManagerSettings.excludeJsonDataByKey.values.length; j++ ) {
					if( adData[self.adManagerSettings.excludeJsonDataByKey.key] == self.adManagerSettings.excludeJsonDataByKey.values[j] ) {
						console.log( 'AdManager.hasExcludedKeyValue(), "' + self.adManagerSettings.excludeJsonDataByKey.key + '": "' + self.adManagerSettings.excludeJsonDataByKey.values[j] + '"' );
						return true;
					}
				}
			}
		}
		return false;		
	}


	self.getNow = function() {
		return DateUtils.getNow( self.adManagerSettings.setTzDesignation.call() )
	}
}

export default AdManager
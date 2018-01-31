/** ----------------------------------------------------------------------------------------------------------------------------------------------------------
	Class: 	StaticGenerator

	Description:
		This class controls the communication with the backend to enable static snap shots of the ad's endframe,
		including the ability to take a shot of every date for a unit with a DateSchedule determining its messaging.
	
	Adding the Schedule:
		(start code)
			// within AdData.js
			import {StaticGenerator} from 'ad-external'

			// create a schedule
			var schedule = new DateSchedule({
				target: new TzDate({
					datetime: Velvet.get('tune_in.datetime'),
					outputTimezone: Velvet.get('tune_in.timezone')
				}),
				isStandard: true
			});

			// add the schedule to StaticGenerator
			StaticGenerator.addSchedule ( schedule );
			// make a call that will be heard by Velvet
			StaticGenerator.dispatchSchedule();
		(end code)

	Calling the snap shot at the end of the ad:
		(start code)
			// within Control
			this.animationComplete = function() {
				console.log( 'Control.animationComplete()' );
				StaticGenerator.dispatchSnapshot();
			}

			// then from the end of the animation, call 
			Control.animationComplete()

		(end code)
		
	Notes:
		Some notes forthcoming.

	---------------------------------------------------------------------------------------------------------------------------------------------------------- */
export default class StaticGenerator {
  constructor () {
    schedule = [];
  }

  /**
		@memberOf StaticGenerator
		@method schedule
		@param {DateSchedule} schedule
			A DateSchedule instance that determines different endframe messaging/layout
		@desc
			Add a DateSchedule to the class to be dispatched back to the server.  A screen snap shot will be generated for each 
			date in the schedule. This method can be called as many times as necessary such as with an ESPN double header. However, 
			this should correspond to any DateSchedule that affects the endframe's layout/messaging only. 
	*/
  static addSchedule (schedule) {
    console.log ('StaticGenerator.addSchedule()');
    var dates = schedule.getDates (true);
    var tz = schedule.target.outputTimezone.abbr.toUpperCase ();

    for (var i = 0; i < dates.length; i++) {
      var item = dates[i];
      var date = item.date;

      var obj = {
        date: date.toDateTimeISO () +
          Timezone.toISO (date.outputTimezone, Timezone.getDLS (date)),
        tz: tz,
        ltz: adParams.defaultTimezone,
        label: item.standardKey,
      };

      console.log ('\t', date.toFullDateTime (), '\t', item.standardKey);

      this.schedule.push (obj);
    }
  }

  /**
		@memberOf StaticGenerator
		@method dispatchSchedule
		@desc
			Passes all schedule dates back to the server.  This is the list of dates that the ad will be set to inorder to get 
			each different end frame messaging. This should be called from AdData after all DateSchedules are defined and passed in.
	*/

  static dispatchSchedule () {
    console.log ('StaticGenerator.dispatchSchedule()\n\t', this.schedule);
    this.dispatch ('setParameters', this.schedule);
  }

  /**
		@memberOf StaticGenerator
		@method dispatchSchedule
		@desc
			Calls back to the server to take a screen snap shot. This must be called after all animation is complete. 
	*/
  static dispatchSnapshot () {
    console.log ('StaticGenerator.dispatchSnapshot()');
    this.dispatch ('snapshot', {});
  }

  dispatch (event, data) {
    if (typeof window.callExternal === 'function') {
      window.callExternal ({
        event: event,
        data: data,
      });
    }
  }
}
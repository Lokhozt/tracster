The scheduling tool:

The scheduling tool is a tool usable by admins to automatically create and organize repetitions.

The tool is presented as a list of steps:

Step 1- Choreographies and groups
The user choose Choreographies or choreographies+group and add them in a list. A choreography or choreography+group can be added multiple time.
For each choreography the user input a desired duration (default 1 hour)

Step 2- Days and locations
The user choose on which days the scheduling takes place. By default it is the next week end (Saturday and Sunday).
The user choose the available locations using the list of location.
For each location, the user can edit when they are available on the selected days.
The user set a rest time between choreographies (default 10 minutes)

Step 3- Constraints
The use can add constraints to each choreography / choreographies+group:
- A choreography/choreographies+group can be limited to certain location
- A choreography/choreographies+group can be limited to certain datetimes

Step 4- Generation
This is the backend work. The tool create a optimized schedule using the constraints. If affect choreography/choreographies+group to a location. Choreographies can be shedule on overlapping time if they are in different locations. To navigate the possibilities use an A* algorithm with the following weigth to calculate the score that should me maximized:

Don't consider participants / choreographer that are not available at all on the scheduling period.

* If a constraint is not respected : -100
* If a choreographer is not available: -50
* If a participant is not available: -10
* If a participant has a hole between 2 choreographies: -5 
* If a participant has 2 consecutive choreography (even in different location): +2
* If a participant has more than 3 consecutives choreographies: -5
* If a participant has no time between 12h and 14h: -20
* Il a choreography starts before 9h: -1
* Il a choreography starts before 10h: -1
* If a choreography ends after 20h: -2
* If a choreography overlap with 12h30-14h: -2
* If a participant in in two or more repetition that overlap in time (different location): -10

The algorithm returns 3 candidates.

Step 5- Choose a solution
The user can look and select one the candidate.
A candidate is graphically reprensented on a calendar with as many column per day as there are locations, with each repetition having its color and name, and start_time->end_time
The caveat of each candidate are listed: Participants not available (ignore if the participant is not available at all during the period)

At validation, each repetition is automatically created.
The scheduling tool:

The scheduling tool is a tool usable by admins to automatically create and organize rehearsals.

The tool is presented as a list of steps:

Step 1- Choreographies and groups
The user choose Choreographies or choreographies+group and add them in a list. A choreography or choreography+group can be added multiple time.
For each choreography the user input a desired duration (default 1 hour)
The user can export the ordered list and durations as a named collection. Exporting with an existing name overwrites that collection.
Importing a collection replaces the current list. The imported list can be modified without changing the saved collection until it is exported again.

Step 2- Days and locations
The user choose on which days the scheduling takes place. By default it is the next week end (Saturday and Sunday).
The user choose the available locations using the list of location.
For each selected location, the user can mark it as preferred.
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
* If a participant has a hole longer than the rest setting between 2 rehearsals: -5
* If a participant has 2 consecutive rehearsals with a gap of at most the rest setting: +2
* If a participant has more than 3 consecutives choreographies: -5
* If a participant has no time between 12h and 14h: -20
* If a rehearsal starts before 9h: -1
* If a rehearsal ends after 20h: -2
* If a rehearsal overlap with 12h30-14h: -2
* If a participant in in two or more rehearsal that overlap in time (different location): -10
* If a rehearsal is in a "prefered location": +1
* For each started hour between the first bookable minute of a day and the first rehearsal of that day: -1

The algorithm returns 3 candidates.

Step 5- Choose a solution
The user can look and select one the candidate.
A candidate is graphically reprensented on a calendar with as many column per day as there are locations, with each rehearsal having its color and name, and start_time->end_time
The caveat of each candidate are listed: Participants not available (ignore if the participant is not available at all during the period)

Optional step 6- Edit
The user can drag rehearsals in the selected candidate to another time, day, or location before creating them.
After every move, conflicts are recalculated and displayed for participants who are unavailable or already in another rehearsal, including another rehearsal in the edited planning.

At validation, each rehearsal is automatically created.
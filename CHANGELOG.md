# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.1 - 23-09-2026

### Added
- Scheduling candidates and the optional edit step list choreographers who are unavailable, separately from participants.
- On the modifying step of scheduling added the possibility to display unavailability and participation of a selected user. 
- The edit step lists participants who are unavailable for the whole planning period.
- Rehearsal hover tooltips in the scheduling calendars show choreographers, unavailable participants, and participants already in another overlapping rehearsal.

### Changed
- Scheduling scoring now treats a slot with no available choreographer more severely, and penalizes a short midday break (less than half an hour between 12h and 14h) in addition to a fully blocked lunch.
- Generated plans favour rehearsals their choreographer can attend: a choreographer scheduled in two pieces running at the same time is now penalized and reported as a caveat on the candidate.
- The planning algorithm places pieces whose choreographers have unavailability during the period before the others, so those rehearsals get the slots their choreographer can actually attend.
- Rehearsals that start before 9h or end after 20h are discouraged more strongly; gaps between a participant’s rehearsals and long consecutive streaks weigh less.
- Participants unavailable for the whole planning period are omitted from per-rehearsal conflicts on the edit step.

## 1.1.0 - 22-09-2026

### Changed
- Improvement to planning algorithm:
    -Scores a new rehearsal as a delta instead of rescoring the whole partial plan.
    -Builds room/person occupancy only for the ~300 beam survivors.
    -Prefers start times that pack against existing rehearsals and lunch/midday edges, then samples the rest.
    -Caps placements per item and spreads them across locations and days.
    -Places constrained, high-overlap items first.
    -Deduplicates identical states and keeps more structurally different partials in the beam.

### Fixed
- Fixed planing not starting at 9am due to a Locales issue
- Line breaks typed in a choreography description are kept when the description is displayed on the choreography page.

## 1.0.4 - 21-09-2026

### Added

- Choreography creators (and admins) can transfer ownership of a piece to another choreographer on it.
- Participants can mark themselves as not participating from event cards and the event page.
- Joining or leaving a repeating event asks whether to apply that answer to all future occurrences.
- The choreography page can be searched by choreography name, choreographer, representation, or tag.

### Changed

- The choreography page uses a settings-style section menu. Overview shows the title, description, choreographers, participants (A–Z), and tags. Resources, groups, representations, demonstrations, rehearsals, editing, and admin actions each have their own section.
- Update to choreography cards
- Hiding events you are not participating in also hides them on the planning calendar and omits them from the image export.
- Event cards show a green “I'm participating” or red “I'm not participating” label instead of a checkmark.
- The choreography tag filter has been removed.
- Members on the settings page, event and choreography participant lists, and add-participant pickers are ordered by first name.

### Fixed
- Fixed registering password leaking into the registering email field
- The start and end times at the top of an event page no longer differ from the time that was set; they were formatted in the server's timezone instead of the reader's.
- Generated plannings start at 9h again. They followed the hosting server's timezone (UTC in production) instead of the association's, which pushed every rehearsal later in the day. The timezone is set with `APP_TIMEZONE` and defaults to `Europe/Paris`.
- Linking an existing representation to a choreography no longer lists representations that have already ended.
- The choreography representation filter no longer lists representations that have already ended.


## 1.0.3 - 17-09-2026

### Added

- Admins can delete a member from that person’s page. Deleted people are removed from every event and choreography; pieces and events they created are kept.
- Members can be marked as competitors. This is a status, not a role, and can be set or unset from Account or that person’s settings page.
- Training is a built-in event type visible only to competitors (and to admins managing the calendar).
- Events, rehearsals, trainings, and custom event types can repeat every chosen weekday for a number of weeks. Representation, festival, competition, and demonstration cannot. Editing or deleting one occurrence can apply to the rest of the upcoming series.
- Possibility to export planning as an image based on the current filters.
- Site setting to show birthdays on the planning
- Admins can toggle birthday display on the setting page
- When `REGISTERING_PASSWORD` is set, creating an account asks for that password before personal details.
- In the scheduling tool, possibility to export the planning as an image before generating the repetitions.
- `make db-from-dump DUMP=/path/to/dump.sql` replaces the local Docker database with a SQL dump.

### Changed

- The settings page lists its categories (site settings, association calendar, event types, locations, members) in a side menu and shows only the selected one instead of stacking every section. On small screens the categories fill the width and give way to the chosen one, with a link back to the list.

## 1.0.2 - 2026-09-14

### Added

- The choreographies page can be filtered to pieces linked to a selected representation. The choice is stored in a cookie.
- The events and planning pages remember the “hide events I’m not in” filter in a cookie. 

### Fixed

- Creating an event no longer counts as being in it for that filter.

### Changed

- Event cards on the schedule and events pages are tinted with their event-type color, matching the filter chips and the calendar.
- The event-type filter on the planning page sits below the calendar.


## 1.0.1 - 2026-09-09

### Added

- Scheduling tool: locations can be marked "Prefer this location" in step 2. Each rehearsal placed in a preferred location adds 1 to the candidate score.
- Scheduling tool: choreography/group selections and durations can be exported as named collections and imported later. Importing replaces the current list without linking subsequent edits to the saved collection; exporting an existing name overwrites it.
- Scheduling tool: an optional final edit step lets admins drag generated rehearsals to another time, day, or location. Participant unavailability and overlapping-rehearsal conflicts are recalculated after every move.
- Admins and the owner can edit any member's unavailability from the unavailability page by choosing that person in a dropdown.
- Admins and the owner can generate a one-time password reset link for a member from that member's page. The link expires after 1 hour, 24 hours, or 7 days, and creating a new one or revoking it invalidates the previous link.


### Fixed

- Scheduling tool: the generated candidates are no longer near-copies of each other. Candidates were only compared on 30-minute time buckets, so the same plan shifted by ten minutes counted as a separate option. Two plans are now the same option when every rehearsal keeps its location and no rehearsal moves by an hour or more, and fewer than three candidates are returned when there is no real alternative.
- Scheduling tool: candidates now open the day at 09:00 instead of drifting into the afternoon. The score was flat across the whole 09:00-20:00 window, so packing rehearsals into the longest contiguous block (the afternoon, once the midday break splits the day) scored as well as using the morning. Each started hour between a day's first bookable minute and its first rehearsal now costs 1 point.

### Changed

- Event, rehearsal, representation, demonstration, and choreography cards open when clicked anywhere on the box, instead of only on the title. Buttons and links inside a card, such as edit, delete, join, and availability, keep their own behaviour.
- Scheduling tool: removed the (already inert) scoring penalty for rehearsals starting before 10:00.
- On small screens, the hour labels on the unavailability week grid stay pinned to the left while the days scroll sideways.

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.1

### Added

- Scheduling tool: locations can be marked "Prefer this location" in step 2. Each rehearsal placed in a preferred location adds 1 to the candidate score.
- Scheduling tool: choreography/group selections and durations can be exported as named collections and imported later. Importing replaces the current list without linking subsequent edits to the saved collection; exporting an existing name overwrites it.
- Scheduling tool: an optional final edit step lets admins drag generated rehearsals to another time, day, or location. Participant unavailability and overlapping-rehearsal conflicts are recalculated after every move.
- Admins and the owner can edit any member's unavailability from the unavailability page by choosing that person in a dropdown.
- Admins and the owner can turn admin privileges off from their account page to use Tracster as a regular member, and turn them back on there.

### Fixed

- Scheduling tool: the generated candidates are no longer near-copies of each other. Candidates were only compared on 30-minute time buckets, so the same plan shifted by ten minutes counted as a separate option. Two plans are now the same option when every rehearsal keeps its location and no rehearsal moves by an hour or more, and fewer than three candidates are returned when there is no real alternative.
- Scheduling tool: candidates now open the day at 09:00 instead of drifting into the afternoon. The score was flat across the whole 09:00-20:00 window, so packing rehearsals into the longest contiguous block (the afternoon, once the midday break splits the day) scored as well as using the morning. Each started hour between a day's first bookable minute and its first rehearsal now costs 1 point.

### Changed

- Scheduling tool: removed the (already inert) scoring penalty for rehearsals starting before 10:00.
- On small screens, the hour labels on the unavailability week grid stay pinned to the left while the days scroll sideways.

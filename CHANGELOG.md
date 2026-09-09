# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.1

### Added

- Scheduling tool: locations can be marked "Prefer this location" in step 2. Each rehearsal placed in a preferred location adds 1 to the candidate score.
- Scheduling tool: choreography/group selections and durations can be exported as named collections and imported later. Importing replaces the current list without linking subsequent edits to the saved collection; exporting an existing name overwrites it.
- Admins and the owner can edit any member's unavailability from the unavailability page by choosing that person in a dropdown.

### Fixed

- Scheduling tool: candidates now open the day at 09:00 instead of drifting into the afternoon. The score was flat across the whole 09:00-20:00 window, so packing rehearsals into the longest contiguous block (the afternoon, once the midday break splits the day) scored as well as using the morning. Each started hour between a day's first bookable minute and its first rehearsal now costs 1 point.

### Changed

- Scheduling tool: removed the (already inert) scoring penalty for rehearsals starting before 10:00.
- On small screens, the hour labels on the unavailability week grid stay pinned to the left while the days scroll sideways.

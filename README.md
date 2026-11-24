# Desai Foundation Avni: interactive demo

A practice copy of the Desai Foundation Trust Avni phone app, in one offline web page. On the left, a guide with lessons in English, Hindi and Gujarati. On the right, a phone that runs Desai's real forms, rules and Home cards on Avni's own model classes.

All people in the demo are invented. Nothing on the page talks to a server.

## Build and open

Needs Python 3. The self-test and screenshot scripts also need Google Chrome.

```sh
python3 tools/build.py          # writes dist/index.html
open dist/index.html            # or double-click it
```

`dist/index.html` is one file with everything inside it. Share that file, or host it on any static site.

## Update to a new bundle

1. Export the bundle zip from App Designer.
2. `python3 tools/make_bundle.py path/to/bundle.zip`, which writes `data/bundle.json`.
3. `python3 tools/build.py`.
4. `tools/selftest.sh`, which must print PASS.

If the new bundle changes a form, rule or label that a lesson uses, update that lesson in `src/lessons.js` and its text in `data/i18n.json`.

## How it works

**What goes in**

| Input | File |
|---|---|
| The Desai bundle: forms, concepts, rules, cards, dashboards, user groups, privileges, labels | `data/bundle.json`, made by `tools/make_bundle.py` |
| Avni's own code: openchs-models, rules-config, moment and lodash, bundled once | `tools/vendor/rt.js` |
| Guide sentences in English, Hindi and Gujarati | `data/i18n.json` |
| The phone's words in Hindi and Gujarati (Avni's app translations plus Desai form labels) | `data/app-i18n.json` |
| Lessons, "What it does" (88 features), practice data | `src/lessons.js`, `data/enhancements.json`, `src/core.js` |

`tools/build.py` puts the CSS, Avni's code, the bundle, the words and every `src/*.js` into `dist/index.html`.

**What runs in the page**

| File | Job |
|---|---|
| `src/core.js` | Practice data: invented people, batches, camps, events and planned visits, dated around today. "Reset" rebuilds them. |
| `src/engine.js` | Turns practice data into real Avni objects (Individual, Encounter and so on) and runs the bundle's own rules: show and hide, checks, auto values, visit planning, decisions, eligibility, card counts, summaries. |
| `src/ui.js` | Avni 18.2 screens: Home cards, search, register, person page, forms page by page, summary, save. Saving stores the record and plans the next visits from the rules. |
| `src/applang.js` | After each screen is drawn, swaps its words into Hindi or Gujarati when that language is picked. |
| `src/lessons.js`, `src/guide.js` | The guide. Each step lights up one part of the phone. "Do it for me" taps it; "Back" replays the lesson to the previous step. |
| `src/main.js` | Starts the page. |
| `src/track.js` | A switched-off stub; the page counts nothing. |

**On every tap:** the phone runs the action (open, answer, next, save), the bundle's rules run again on the form, the screen is redrawn, the words are translated if needed, and the guide checks the step and lights the next one. Save also runs the visit-planning rule, so a new follow-up shows under "Visits planned" and on the Home cards, as on the phone.

Lessons find buttons by hidden tags, not by their words, so they work in every language.

## Checks

| Command | What it checks |
|---|---|
| `tools/selftest.sh` | Plays every lesson with "Do it for me" and checks each result, for example that a saved follow-up planned nothing more. |
| `tools/shot.sh name "lesson=attendance&steps=3"` | Takes a screenshot of a lesson step. Set `QA_DIR` to choose the folder. |
| `python3 tools/strings.py` | Lists every guide sentence into `data/strings.json`, so none is left untranslated. |

Set `CHROME` if Chrome is not at its usual macOS path.

## Before staff use it

The Hindi and Gujarati text needs a check by a Desai Foundation native reader.

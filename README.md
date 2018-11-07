# dry-vac:


***DRAFT!!! NOT READY FOR PUBLIC USE AT THIS TIME.***


The Don't Repeat Yourself (dry) Voice Assistant Composer (vac).

A format for specifying Voice Assistant language models that is highly compact, easy to type, clean to diff, and which minimises repetition.

Dry, not Wet.

## Install
```
npm install -g dry-vac
```

# Usage:

## Dialogflow setup
1. Create your Dialogflow project at dialogflow.com
2. In Dialogflow set the name, description, timezone, and other settings for your Agent
3. Export the project as a zip: 'Cog'->Export and Import->EXPORT AS ZIP
4. Extract the zip into a folder, e.g. `My-DF-Agent`

## Ongoing usage
1. Create a dry-vac formatted file, for example:
   ```yaml
   # File: my-nlu-model.yaml
   # A basic dry-vac NLU model:
   INTENT: HelloWorld
     hello world
   ```
2. Convert and integrate the dry-vac NLU model into your agent:
   ```sh
   $ dry-vac -d My-DF-Agent my-nlu-model.yaml
   ```
3. Zip up the updated contents of the folder 'My-DF-Agent' with your favourite zipping tool - ensuring you **do not** include the parent folder in the zip, per Dialogflow requirements
4. Upload the zip in Dialogflow via: 'Cog'->Export and Import->RESTORE FROM ZIP. <p>**WARNING:** This will totally replace the contents of the Dialogflow agent. Be sure to keep a backup - e.g. The original zip you exported

# 'Reverse' operation
`dry-vac` can also be used to DERIVE a compact dry-vac formatted NLU model, from a Dialogflow Agent definition. This is useful to transition from working in the Dialogflow GUI, to working with dry-vac.

To use this feature, first complete Dialogflow Setup as described above.

Then:
```
$ dry-vac --reverse -d My-DF-Agent NewSource.yaml
```

Will create a new file 'NewSource.yaml' that contains a dry-vac formatted version of the Agent NLU. The output file must not already exist or an error will occur, to protect accidental over-writes.



# dry-vac:


***DRAFT!!! NOT READY FOR PUBLIC USE AT THIS TIME.***


The Don't Repeat Yourself (dry) Voice Assistant Composer (vac).

A format for specifying Voice Assistant NLU (Natural Language Understanding) models that is highly compact, easy to type, clean to diff, and which minimises repetition.

Dry, not Wet.

Probably, dry-vac will only make sense to you if you have worked with the Alexa Skills Kit or Dialogflow.

## Example:
```yaml
# A basic dry-vac NLU model:   ('#' introduces comments)
ENTITY: color
  red ~ reddish|crimson
  blue ~ sky blue|dark blue|light blue

$Favorite = favorite|best|most favorite|most loved
$myFavorite = $Favorite|my $Favorite

INTENT: MyFavoriteColorIs
SLOT: color :color ~red   # - Format is "SLOT: name :type ~canonical example"
  $myFavorite color is <color~blue>
  <color> is my $Favorite color

INTENT: WhatsMyFavoriteColor
  (what's|what is) my $Favorite color
```

**Example notes:**
* The 2 example lines of MyFavoriteColorIs expand to 12 example sentences for the Intent
* The indented lines above are collections of content for the preceding ENTITY/INTENT. (The indents are not strictly essential)
* Variables can be declared and used with '$'. These expand in INTENT collections
* SLOTs are key content in Intents. They need a type (":color"), but it can be ommitted if the slot and entity have the same name. (It could be omitted above)
* SLOT references can include canonical example text via '~'. If not supplied inline with each sentence ("~blue") it can be supplied with the slot definition ("~red") to be inferred for all references.




## Install
```
npm install -g dry-vac
```

# Usage:

## Dialogflow Setup
1. Create your Dialogflow project at dialogflow.com
2. In Dialogflow set the name, description, timezone, and other settings for your Agent
3. Export the project as a zip: 'Cog'->Export and Import->EXPORT AS ZIP
4. Extract the zip into a folder, e.g. `My-DF-Agent`

## Ongoing Usage
1. Ensure you have your agent NLU ready in a folder as described in Setup above
1. Create a dry-vac formatted file as shown above under Example
1. Convert and integrate the dry-vac NLU model into your agent:
   ```sh
   $ dry-vac -d My-DF-Agent my-nlu-model.yaml
   ```
1. Zip up the updated contents of the folder 'My-DF-Agent' with your favourite zipping tool - ensuring you **do not** include the parent folder in the zip, per Dialogflow requirements. (The agent.json file should be at the top of the zip - Not in a sub-folder)
1. Upload the zip in Dialogflow via: 'Cog'->Export and Import->RESTORE FROM ZIP. <p>**WARNING:** This will totally replace the contents of the Dialogflow agent. Be sure to keep a backup - e.g. The original zip you exported

# 'Reverse' operation
`dry-vac` can also be used to DERIVE a compact dry-vac formatted NLU model, from a Dialogflow Agent definition. This is useful to transition from working in the Dialogflow GUI, to working with dry-vac.

To use this feature, first complete Dialogflow Setup as described above.

Then:
```
$ dry-vac --reverse -d My-DF-Agent NewSource.yaml
```

Will create a new file 'NewSource.yaml' that contains a dry-vac formatted version of the Agent NLU.

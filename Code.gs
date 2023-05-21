// IMPORTANT! Enable dev mode when testing.
// HighQualityUtils.settings().enableDevMode()
HighQualityUtils.settings().setAuthToken(ScriptProperties)

/**
 * Simple spreadsheet edit trigger function.
 * Marking a submission as accepted will trigger this function to add it to the database.
 * @param {Edit} event - The edit event object.
 */
function onEdit(event) {
  const range = event.range
  const sheet = range.getSheet()

  console.log(`New edit in "${sheet.getName()}" sheet range ${range.getA1Notation()}`)

  switch (sheet.getName()) {
    case "Videos":
    case "Channels":
    case "Playlists":
    case "Contributor Playlists":
      // checkSubmission(range)
      break;
    default:
      console.log("There are no tasks to complete")
  }
}

/**
 * Add the submission to the database if it's been accepted and doesn't already exist.
 * @param {Range} cellRange - The range of the edited cells.
 */
function checkSubmission(cellRange) {
  const sheet = cellRange.getSheet()
  const rowRange = sheet.getRange(1, cellRange.getRowIndex(), 1, sheet.getLastColumnIndex)
  const [timestamp, stringOfIds, isAccepted, isResolved, notes] = rowRange.getValues()[0]

  if (isAccepted !== "TRUE") {
    console.log("This submission hasn't been accepted yet")
    return
  } else if (isResolved === "TRUE") {
    console.log("This submission has already been resolved")
    return
  }

  const ids = splitStringOfIds(stringOfIds)

  switch (sheet.getName()) {
    case "Videos":
      HighQualityUtils.videos().createAll(ids) // TODO
      break;
    case "Channels":
      HighQualityUtils.channels().createAll(ids) // TODO
      break;
    case "Playlists":
    case "Contributor Playlists":
      HighQualityUtils.playlists().createAll(ids) // TODO
      break;
  }

  // Set "Resolved?" to true
  row.check()
}

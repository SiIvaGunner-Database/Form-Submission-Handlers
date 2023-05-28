// IMPORTANT! Enable dev mode when testing.
HighQualityUtils.settings().enableDevMode()
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
  let [timestamp, stringOfIds, isAccepted, isResolved, notes] = rowRange.getValues()[0]

  if (isAccepted !== "TRUE") {
    console.log("This submission hasn't been accepted yet")
    return
  } else if (isResolved === "TRUE") {
    console.log("This submission has already been resolved")
    return
  }

  notes = []

  splitStringOfIds(stringOfIds).forEach(id => {
    console.log(`Adding ${id}`)

    try {
      switch (sheet.getName()) {
        case "Videos":
          notes.push(getNewVideoResult(id))
          break;
        case "Channels":
          notes.push(getNewChannelResult(id))
          break;
        case "Playlists":
        case "Contributor Playlists":
          notes.push(getNewPlaylistResult(id))
          break;
        default:
          console.warn("Invalid sheet")
      }
    } catch (error) {
      console.warn(`Failed to add ${id}`, error)
      notes.push(`Failed to add ${id}`)
    }
  })

  isResolved = true
  rowRange.setValues([[timestamp, stringOfIds, isAccepted, isResolved, notes.join("\n")]])
}

/**
 * Add a video to the database and return the logged result.
 * @param {String} id - The video ID.
 * @return {String} The result of the operation.
 */
function getNewVideoResult(id) {
  const video = HighQualityUtils.videos().getById(id)
  const channel = video.getChannel()

  const videoSheet = channel.getSheet()
  const undocumentedRipsPlaylist = channel.getUndocumentedRipsPlaylist()

  if (video.getDatabaseObject() !== undefined) {
    return formatAlreadyAddedResult(id)
  }

  const defaults = {
    "wikiStatus": video.getWikiStatus(),
    "videoStatus": video.getYoutubeStatus()
  }
  video.createDatabaseObject(defaults)

  if (undocumentedRipsPlaylist !== undefined && video.getDatabaseObject().wikiStatus === "Undocumented") {
    undocumentedRipsPlaylist.addVideo(id)
  }

  const videoValues = [[
    HighQualityUtils.utils().formatYoutubeHyperlink(id),
    video.getWikiHyperlink(),
    video.getDatabaseObject().wikiStatus,
    video.getDatabaseObject().videoStatus,
    video.getDatabaseObject().publishedAt,
    video.getDatabaseObject().duration,
    video.getDatabaseObject().description,
    video.getDatabaseObject().viewCount,
    video.getDatabaseObject().likeCount,
    0, // Dislike count
    video.getDatabaseObject().commentCount
  ]]

  videoSheet.insertValues(videoValues)
  videoSheet.sort(5)

  return formatAddedResult(id)
}

/**
 * Add a channel to the database and return the logged result.
 * @param {String} id - The channel ID.
 * @return {String} The result of the operation.
 */
function getNewChannelResult(id) {
  const channel = HighQualityUtils.channels().getById(id)
  const channelSheet = channel.getSheet() // TODO get the channel sheet instead of the video sheet
  const videoSpreadsheet = channel.getSpreadsheet()

  if (channel.getDatabaseObject() !== undefined) {
    return formatAlreadyAddedResult(id)
  }

  const defaults = {
    "channelStatus": channel.getYoutubeStatus()
  }
  channel.createDatabaseObject(defaults)

  const channelValues = [[
    HighQualityUtils.utils().formatYoutubeHyperlink(id),
    channel.getSpreadsheetHyperlink(),
    channel.getDatabaseObject().title,
    channel.getWikiHyperlink(),
    channel.getDatabaseObject().channelStatus,
    channel.getDatabaseObject().publishedAt,
    channel.getDatabaseObject().description,
    channel.getDatabaseObject().videoCount,
    channel.getDatabaseObject().subscriberCount,
    channel.getDatabaseObject().viewCount
  ]]

  channelSheet.insertValues(channelValues)
  channelSheet.sort(3)

  // TODO create and format a new sheet in the fan channel rips spreadsheet and populate the values

  return formatAddedResult(id)
}

/**
 * Add a playlist to the database and return the logged result.
 * @param {String} id - The playlist ID.
 * @return {String} The result of the operation.
 */
function getNewPlaylistResult(id) {
  const playlist = HighQualityUtils.playlists().getById(id)
  const channel = playlist.getChannel()

  if (video.getDatabaseObject() !== undefined) {
    return formatAlreadyAddedResult(id)
  }

  // TODO add the missing playlist

  return formatAddedResult(id)
}

/**
 * Format an unnecessary addition result.
 * @param {String} id - The object ID.
 * @return {String} The result: "[id] has already been added".
 */
function formatAlreadyAddedResult(id) {
  const result = `${id} has already been added`
  console.log(result)
  return result
}

/**
 * Format a successful addition result.
 * @param {String} id - The object ID.
 * @return {String} The result: "Added [id]".
 */
function formatAddedResult(id) {
  const result = `Added ${id}`
  console.log(result)
  return result
}

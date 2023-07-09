// IMPORTANT! Enable dev mode when testing.
// HighQualityUtils.settings().enableDevMode()
HighQualityUtils.settings().setAuthToken(ScriptProperties)

/**
 * Check all applicable sheets for newly approved submissions to add to the database.
 */
function checkSpreadsheetForNewSubmissions() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId()
  const spreadsheet = HighQualityUtils.spreadsheets().getById(spreadsheetId)
  const sheetNames = ["Videos", "Channels"]

  sheetNames.forEach(sheetName => {
    console.log(`Checking sheet ${sheetName}`)
    const sheet = spreadsheet.getSheet(sheetName)
    checkSheetForNewSubmissions(sheet, sheetName)
  })
}

/**
 * Check a single sheet for newly approved submissions to add to the database.
 * @param {Sheet} sheet - The sheet to check for new submissions.
 */
function checkSheetForNewSubmissions(sheet, sheetName) {
  const values = sheet.getValues()
  const isResolvedColumn = 4

  values.forEach(([timestamp, stringOfIds, isAccepted, isResolved, notes], index) => {
    if (isAccepted !== true || isResolved === true) {
      return
    }

    const row = index + 2
    console.log(`Newly approved submission on row ${row}`)
    const ids = HighQualityUtils.utils().splitStringOfIds(stringOfIds)

    notes = ids.map(id => {
      const result = getNewObjectResult(id, sheetName)
      console.log(result)
      return result
    }).join("\n")

    isResolved = true
    sheet.updateValues([[isResolved, notes]], row, isResolvedColumn)
  })
}

/**
 * Add an object to the database and return the logged result.
 * @param {String} id - The object ID.
 * @param {String} sheetName - The sheet name.
 * @return {String} The result of the operation.
 */
function getNewObjectResult(id, sheetName) {
  try {
    switch (sheetName) {
      case "Videos":
        if (id.length !== 11 && id.includes("PL") === true) {
          const [videos] = HighQualityUtils.youtube().getPlaylistVideos(id)
          const videoIds = videos.map(metadata => metadata.id)
          return videoIds.map(videoId => getNewVideoResult(videoId)).join("\n")
        }
        return getNewVideoResult(id)
      case "Channels":
        return getNewChannelResult(id)
      case "Playlists":
      case "Contributor Playlists":
        return getNewPlaylistResult(id)
      default:
        throw new Error(`Invalid sheet name ${sheetName}`)
    }
  } catch (error) {
    console.error(error)
    return `Failed to add ${id}`
  }
}

/**
 * Add a video to the database and return the logged result.
 * @param {String | Video} videoOrId - The video model or video ID.
 * @return {String} The result of the operation.
 */
function getNewVideoResult(videoOrId) {
  let video = videoOrId

  if (typeof videoOrId === "String") {
    if (videoOrId.length !== 11) {
      return `Invalid video ID "${videoOrId}"`
    }

    video = HighQualityUtils.videos().getById(videoOrId)
  }

  if (video.getDatabaseObject() !== undefined) {
    return `${id} has already been added`
  }

  const channel = video.getChannel()
  const videoSheet = channel.getSheet()
  const undocumentedRipsPlaylist = channel.getUndocumentedRipsPlaylist()
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
  videoSheet.sort(5, false)
  return `Added video ${id}`
}

/**
 * Add a channel to the database and return the logged result.
 * @param {String} id - The channel ID.
 * @return {String} The result of the operation.
 */
function getNewChannelResult(id) {
  if (id.includes("UC") === false) {
    return `Invalid video ID "${id}"`
  }

  const channel = HighQualityUtils.channels().getById(id)

  if (channel.getDatabaseObject() !== undefined) {
    return `${id} has already been added`
  }

  const channelSheet = HighQualityUtils.spreadsheets().getById("16PLJOqdZOdLXguKmUlUwZfu-1rVXzuJLHbY18BUSOAw").getSheet("Channels")
  const defaults = {
    "channelStatus": channel.getYoutubeStatus(),
    "productionSpreadsheet": "1Q_L84zZ2rzS57ZcDcCdmxMsguqjpnbLGr5_QVX5LVKA", // SiIvaGunner Fan Channel Rips
    "developmentSpreadsheet": "1JhARnRkPEtwGFGgmxIBFoWixB7QR2K_toz38-tTHDOM" // Copy of SiIvaGunner Fan Channel Rips
  }
  channel.createDatabaseObject(defaults)
  const videoSpreadsheet = channel.getSpreadsheet()

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
  let videoSheet = videoSpreadsheet.getSheet(channel.getDatabaseObject().title)

  // If the sheet hasn't been created yet, create and format it
  if (videoSheet.getOriginalObject() === undefined) {
    videoSheet.create(channel.getDatabaseObject().title)
    const columnLabels = [
      "ID", "Title", "Wiki Status", "Video Status", "Upload Date (UTC)",
      "Length", "Description", "Views", "Likes", "Dislikes", "Comments"
    ]
    const dateColumnIndexes = [6]
    const hiddenColumnIndexes = [3]
    videoSheet.format(columnLabels, dateColumnIndexes, hiddenColumnIndexes)
  }

  // Update the index sheet
  const spreadsheetId = videoSheet.getOriginalObject().getParent().getId()
  const sheetId = videoSheet.getOriginalObject().getSheetId()
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`
  const titleHyperlink = HighQualityUtils.utils().formatHyperlink(sheetUrl, channel.getDatabaseObject().title)

  const currentDateUtc = Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd HH:mm:ss")
  const channelIndexValues = [
    [titleHyperlink],
    [`="Currently has " & COUNTIF('${channel.getDatabaseObject().title}'!A2:A, "*") & " rips listed."`],
    [`Last updated ${currentDateUtc} UTC on row 2.`],
    [""]
  ]

  const indexSheet = videoSpreadsheet.getSheetByName("Index");
  const seeAlsoRowIndex = indexSheet.getRowIndexOfValue("See also", 2)

  // Insert four new rows, make the title hyperlink bigger and remove the underline
  indexSheet.insertValues(channelIndexValues, seeAlsoRowIndex)
  indexSheet.getOriginalObject().getRange(seeAlsoRowIndex - 4, 2).setFontSize(14).setFontLine("none")

  // Populate the video data in the new sheet
  const videos = channel.getVideos()
  console.log(`${videos.length} videos found`)
  videos.forEach(video => console.log(getNewVideoResult(video)))

  return `Added channel ${id}`
}

/**
 * Add a playlist to the database and return the logged result.
 * @param {String} id - The playlist ID.
 * @return {String} The result of the operation.
 */
function getNewPlaylistResult(id) {
  if (id.includes("PL") === false) {
    return `Invalid playlist ID "${id}"`
  }

  const playlist = HighQualityUtils.playlists().getById(id)

  if (playlist.getDatabaseObject() !== undefined) {
    return `${id} has already been added`
  }

  const channel = playlist.getChannel()

  // TODO add the missing playlist

  return `Added playlist ${id}`
}

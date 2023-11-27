function cleanObject(obj) {
    const propertiesToRemove = [
        'originalTitle', 'originalLanguage', 'alternateTitles', 'secondaryYearSourceId', 
        'sortTitle', 'sizeOnDisk', 'images', 'website', 'remotePoster', 'hasFile', 
        'qualityProfileId', 'monitored', 'minimumAvailability', 'folderName', 'path',
        'folder', 'cleanTitle', 'titleSlug', 'tags', 'added', 'popularity', 'studio',
        'movieFile', 'collection', 'network', 'languageProfileId', 'seasonFolder',
        'useSceneNumbering', 'tvdbId', 'tvRageId', 'tvMazeId', 'firstAired', 'seriesType',
        'statistics', 'airTime', 'certification', 'seasons', 'ratings', 'inCinemas'
    ];

    // if 'id' key is present, rename/add key to "InLibrary": true
    if (obj.hasOwnProperty('id')) {
        obj.inLibrary = true;
        delete obj.id;
    }

    propertiesToRemove.forEach(prop => {
        delete obj[prop];
    });

    return obj;
}

export { cleanObject };
var utils = require('../utils')
var Issue = utils.issues.Issue

/**
 * session
 *
 * Takes a list of files and creates a set of file names that occur in subject
 * directories. Then generates a warning if a given subject is missing any
 * files from the set.
 */
var session = function missingSessionFiles(fileList) {
  // fileDict is a nested dictionary to sort files by subject and sessions
  var fileDict = getFileDict(fileList)
  var issues = []
  var subject
  var session

  // build the list of all unique filenames and session labels
  var subject_files = []
  var session_labels = []
  for (var subjKey in fileDict) {
    subject = fileDict[subjKey]
    for (var sesKey in subject) {
      session = subject[sesKey]
      if (session_labels.indexOf(sesKey) < 0) {
        session_labels.push(sesKey)
      }
      for (var i = 0; i < session.length; i++) {
        file = session[i]
        if (subject_files.indexOf(file) < 0) {
          subject_files.push(file)
        }
      }
    }
  }

  console.log(subject_files)

  var subjectKeys = Object.keys(fileDict).sort()
  for (var j = 0; j < subjectKeys.length; j++) {
    subject = subjectKeys[j]
    for (var ses = 0; ses < session_labels.length; ses++) {
      session = session_labels[ses]
      console.log(fileDict[subject][session])
      if (typeof fileDict[subject][session] === 'undefined') {
        // No files in this session raise a global warning for all missing files
        issues.push(
          new Issue({
            file: {
              relativePath: subject + '/ses-' + session,
            },
            evidence: 'Subject: ' + subject + '; Missing session: ' + session,
            code: 97,
          }),
        )
        console.log('should stop iteration')
        continue
      }
      console.log(
        subject + '_ses-' + session + ': ' + fileDict[subject][session].length,
      )
      for (var set_file = 0; set_file < subject_files.length; set_file++) {
        if (
          fileDict[subject][session].indexOf(subject_files[set_file]) === -1
        ) {
          var fileThatsMissing =
            '/' + subject + subject_files[set_file].replace('<sub>', subject)
          console.log(fileThatsMissing)
          issues.push(
            new Issue({
              file: {
                relativePath: fileThatsMissing,
                webkitRelativePath: fileThatsMissing,
                name: fileThatsMissing.substr(
                  fileThatsMissing.lastIndexOf('/') + 1,
                ),
                path: fileThatsMissing,
              },
              reason:
                'This file is missing for subject ' +
                subject +
                ', but is present for at least one other subject.',
              code: 38,
            }),
          )
        }
      }
    }
  }
  return issues
}

/**
 * getFileDict
 *
 * Takes a list of files and creates a dictionary sorting files by subject and
 * session.
 */
function getFileDict(fileList) {
  var fileDict = {}
  for (var key in fileList) {
    var file = fileList[key]
    var path = getPath(file)
    var filename
    var subject
    var session

    if (path === null) {
      continue
    }

    subject = getSubjectId(path)
    if (subject === null) {
      continue
    }

    // initialize an empty dict if we haven't seen this subject before
    if (typeof fileDict[subject] === 'undefined') {
      fileDict[subject] = {}
    }

    session = getSessionId(path)
    if (session === null) {
      // Single session dataset
      session = '1'
    }
    // initialize an empty session array if we haven't seen this session before
    if (typeof fileDict[subject][session] === 'undefined') {
      fileDict[subject][session] = []
    }

    // files are prepended with subject name, the following two commands
    // remove the subject from the file name to allow filenames to be more
    // easily compared
    filename = path.substring(path.match(subject).index + subject.length)
    filename = filename.replace(subject, '<sub>')
    fileDict[subject][session].push(filename)
  }

  return fileDict
}

function getPath(file) {
  if (!file || (typeof window != 'undefined' && !file.webkitRelativePath)) {
    return null
  }
  var path = file.relativePath
  if (!utils.type.isBIDS(path) || utils.type.file.isStimuliData(path)) {
    return null
  }
  return path
}

function getSubjectId(path) {
  var subject
  //match the subject identifier up to the '/' in the full path to a file.
  var match = path.match(/sub-(.*?)(?=\/)/)
  if (match === null) {
    return null
  } else {
    subject = match[0]
  }
  // suppress inconsistent subject warnings for sub-emptyroom scans
  // in MEG data
  if (subject == 'sub-emptyroom') {
    return null
  }
  return subject
}

function getSessionId(path) {
  //match the session identifier up to the '/' in the full path to a file.
  var match = path.match(/sub-(.*?)\/ses-(.*?)(?=\/)/)
  if (match === null) {
    return null
  } else {
    session = match[2]
  }
  return session
}

module.exports = session

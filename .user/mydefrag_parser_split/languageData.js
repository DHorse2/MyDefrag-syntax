'use strict';
// languageData.js
//#region KEYWORDS
// All keywords from the grammar (case-insensitive)
// ToDo A few notes on decisions made: 
// fixed appeared twice in your original Set (Sets deduplicate, so only one survived). 
// It's placed under volume_condition since that's its primary use; 
// if your grammar also uses it as a window_state value you can add a second entry.
// fragmented also appeared twice in the original — it's under file_condition (the fragment state test) and 
// I added a second entry under file_state since it doubles as a file state flag.
// text as a zone label is kept under zone; 
// if it also doubles as a literal type name in your tokenizer you may want a second entry with parent: 'literal'.
// Your tokenize(text) call can now filter with .filter(k => k.parent === 'volume_condition') or 
// build a fast lookup with new Map(KEYWORDS.map(k => [k.text, k])) for O(1) access by keyword string.
const KEYWORDS = [
    // ─────────────────────────────────────────────────────────────────────────────────
    // Parent Child Relationships
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Global / Root
    { text: 'any', parent: 'any' },
    // Commands that can be used anywhere
    { text: 'maxruntime', parent: 'any' },
    { text: 'runscript', parent: 'any' },
    { text: 'runprogram', parent: 'any' },
    // ─────────────────────────────────────────────────────────────────────────────────
    { text: 'script', parent: 'script' },
    // Statements:
    // Script-level settings
    { text: 'description', parent: 'script' },
    { text: 'excludevolumes', parent: 'script' },
    { text: 'excludefiles', parent: 'script' },
    // Volume block structure
    { text: 'volume_block', parent: 'script' },
    { text: 'volumeselect', parent: 'volume_block' },
    { text: 'volumeactions', parent: 'volume_block' },
    { text: 'volumeend', parent: 'volume_block' },
    // File block structure (within volumeactions)
    { text: 'file_block', parent: 'volumeactions' },
    { text: 'fileselect', parent: 'volumeactions' },
    { text: 'fileactions', parent: 'file_block' },
    { text: 'fileend', parent: 'file_block' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region Siblings / Child structures
    { text: 'volume_condition', parent: 'volumeselect' },
    { text: 'filesystem', parent: 'volumeactions' },
    { text: 'volume_action', parent: 'volume_actions' },

    { text: 'file_condition', parent: 'fileselect' },
    { text: 'file_attribute', parent: 'fileselect' },
    { text: 'file_action', parent: 'file_actions' },

    { text: 'sort', parent: 'file_action' },
    { text: 'action_modifier', parent: 'action_modifier' },

    { text: 'ui', parent: 'script' },
    { text: 'window_state', parent: 'windowsize' },
    { text: 'finish_action', parent: 'whenfinished' },
    { text: 'priority', parent: 'any' },

    { text: 'runtime', parent: 'script' },
    { text: 'setscreensaver', parent: 'runtime' },
    { text: 'settingInline', parent: 'any' },
    { text: 'conflict', parent: 'batterypower' },

    { text: 'variable', parent: 'any' },
    { text: 'value', parent: 'any' },
    { text: 'toggle', parent: 'any' },
    { text: 'operator', parent: 'any' },
    { text: 'literal', parent: 'any' },
    { text: 'time', parent: 'any' },
    { text: 'math', parent: 'any' },
    { text: 'size_unit', parent: 'any' },
    { text: 'zone', parent: 'any' },
    { text: 'file_state', parent: 'any' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    // KEYWORDS:
    // ─────────────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region VOLUME
    // Volume type conditions
    { text: 'mounted', parent: 'volume_condition' },
    { text: 'writable', parent: 'volume_condition' },
    { text: 'removable', parent: 'volume_condition' },
    { text: 'fixed', parent: 'volume_condition' },
    { text: 'remote', parent: 'volume_condition' },
    { text: 'cdrom', parent: 'volume_condition' },
    { text: 'ramdisk', parent: 'volume_condition' },

    // Volume property conditions
    { text: 'name', parent: 'volume_condition' },
    { text: 'label', parent: 'volume_condition' },
    { text: 'size', parent: 'volume_condition' },
    { text: 'fragmentcount', parent: 'volume_condition' },
    { text: 'fragmentsize', parent: 'volume_condition' },
    { text: 'checkvolume', parent: 'volume_condition' },
    { text: 'commandlinevolumes', parent: 'volume_condition' },
    { text: 'numberbetween', parent: 'volume_condition' },
    { text: 'filesystemtype', parent: 'volume_condition' },

    // Filesystem types
    { text: 'ntfs', parent: 'filesystem' },
    { text: 'fat', parent: 'filesystem' },
    { text: 'fat12', parent: 'filesystem' },
    { text: 'fat16', parent: 'filesystem' },
    { text: 'fat32', parent: 'filesystem' },

    // ─────────────────────────────────────────────────────────────────────────────────
    // Volume actions
    { text: 'reclaimntfsreservedareas', parent: 'volume_action' },
    { text: 'makegap', parent: 'volume_action' },
    { text: 'dismountvolume', parent: 'volume_action' },
    { text: 'deletejournal', parent: 'volume_action' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region FILE SELECT
    // File select properties/name/path conditions

    { text: 'filename', parent: 'file_condition' },
    { text: 'directoryname', parent: 'file_condition' },
    { text: 'directorypath', parent: 'file_condition' },
    { text: 'fullpath', parent: 'file_condition' },

    // File fragmentation conditions
    { text: 'fragmented', parent: 'file_condition' },
    { text: 'averagefragmentsize', parent: 'file_condition' },
    { text: 'largestfragmentsize', parent: 'file_condition' },
    { text: 'smallestfragmentsize', parent: 'file_condition' },

    // File date conditions
    { text: 'lastaccess', parent: 'file_condition' },
    { text: 'lastaccessenabled', parent: 'file_condition' },
    { text: 'lastchange', parent: 'file_condition' },
    { text: 'creationdate', parent: 'file_condition' },

    // File list import conditions
    { text: 'importlistfrombootoptimize', parent: 'file_condition' },
    { text: 'importlistfromfile', parent: 'file_condition' },
    { text: 'importlistfromprogramhints', parent: 'file_condition' },

    // File size conditions
    { text: 'largest', parent: 'file_condition' },
    { text: 'smallest', parent: 'file_condition' },

    // ─────────────────────────────────────────────────────────────────────────────────
    // File select attribute conditions
    { text: 'archive', parent: 'file_attribute' },
    { text: 'compressed', parent: 'file_attribute' },
    { text: 'directory', parent: 'file_attribute' },
    { text: 'encrypted', parent: 'file_attribute' },
    { text: 'hidden', parent: 'file_attribute' },
    { text: 'nottobeindexed', parent: 'file_attribute' },
    { text: 'offline', parent: 'file_attribute' },
    { text: 'readonly', parent: 'file_attribute' },
    { text: 'sparse', parent: 'file_attribute' },
    { text: 'system', parent: 'file_attribute' },
    { text: 'temporary', parent: 'file_attribute' },
    { text: 'virtual', parent: 'file_attribute' },
    { text: 'unmovable', parent: 'file_attribute' },

    // File location conditions
    { text: 'selectntfssystemfiles', parent: 'file_condition' },
    { text: 'filelocation', parent: 'file_condition' },

    // File location values
    { text: 'beginoffile', parent: 'file_location' },
    { text: 'endoffile', parent: 'file_location' },
    { text: 'entirefile', parent: 'file_location' },
    { text: 'anypart', parent: 'file_location' },
    { text: 'anycompletefragment', parent: 'file_location' },

    // File actions (defrag strategies)
    { text: 'addgap', parent: 'file_action' },
    { text: 'defragment', parent: 'file_action' },
    { text: 'fastfill', parent: 'file_action' },
    { text: 'forcedfill', parent: 'file_action' },
    { text: 'movedownfill', parent: 'file_action' },
    { text: 'movetoendofdisk', parent: 'file_action' },
    { text: 'moveuptozone', parent: 'file_action' },

    // ─────────────────────────────────────────────────────────────────────────────────
    // File Sort orders
    { text: 'sortbyname', parent: 'sort' },
    { text: 'sortbysize', parent: 'sort' },
    { text: 'sortbylastaccess', parent: 'sort' },
    { text: 'sortbylastchange', parent: 'sort' },
    { text: 'sortbycreationdate', parent: 'sort' },
    { text: 'sortbynewestdate', parent: 'sort' },
    { text: 'sortbyimportsequence', parent: 'sort' },

    // Placement actions
    { text: 'placentfssystemfiles', parent: 'file_action' },

    // Action modifiers
    { text: 'chunksize', parent: 'defragment' },
    { text: 'fast', parent: 'defragment' },
    { text: 'withshuffling', parent: 'fastfill' },
    { text: 'donotvacate', parent: 'addgap' },
    { text: 'ascending', parent: 'sort' },
    { text: 'descending', parent: 'sort' },
    { text: 'skipblock', parent: 'sort' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region UI / display / flow control settings
    // ─────────────────────────────────────────────────────────────────────────────────
    { text: 'language', parent: 'ui' },
    { text: 'title', parent: 'ui' },
    { text: 'windowsize', parent: 'ui' },
    { text: 'diskmapflip', parent: 'ui' },
    { text: 'statusbar', parent: 'ui' },
    { text: 'zoomlevel', parent: 'ui' },
    // Messaging
    // { text: 'msg', parent: 'ui' },
    { text: 'message', parent: 'ui' },

    // Status Bar
    { text: 'status', parent: 'statusbar' },
    { text: 'path', parent: 'statusbar' },
    { text: 'mouseover', parent: 'statusbar' },
    { text: 'all', parent: 'statusbar' },

    // Window state values
    { text: 'minimized', parent: 'window_state' },
    { text: 'maximized', parent: 'window_state' },
    { text: 'invisible', parent: 'window_state' },
    { text: 'restore', parent: 'window_state' },
    { text: 'fixed', parent: 'window_state' },

    // Post-run / finish actions
    { text: 'wait', parent: 'finish_action' },
    { text: 'exit', parent: 'finish_action' },
    { text: 'shutdown', parent: 'finish_action' },
    { text: 'hibernate', parent: 'finish_action' },
    { text: 'standby', parent: 'finish_action' },
    { text: 'reboot', parent: 'finish_action' },
    { text: 'warnusers', parent: 'finish_action' },
    { text: 'forced', parent: 'finish_action' },
    //#endregion
    // ─────────────────────────────────────────────────────────────────────────────────
    //#region System / settings 
    // Set screensaver values
    { text: 'off', parent: 'setscreensaver' },
    { text: 'reset', parent: 'setscreensaver' },

    // Process priority values
    { text: 'normal', parent: 'priority' },
    { text: 'belownormal', parent: 'priority' },
    { text: 'low', parent: 'priority' },
    { text: 'abovenormal', parent: 'priority' },
    { text: 'high', parent: 'priority' },
    { text: 'background', parent: 'priority' },

    // Setting commands
    { text: 'setting', parent: 'settingInline' },
    { text: 'setfilecolor', parent: 'settingInline' },
    { text: 'setcolor', parent: 'settingInline' },

    // Runtime behavior settings
    { text: 'pause', parent: 'any' },
    { text: 'writelogfile', parent: 'any' },
    { text: 'appendlogfile', parent: 'any' },
    { text: 'debug', parent: 'any' },
    { text: 'slowdown', parent: 'runtime' },
    { text: 'whenfinished', parent: 'runtime' },
    { text: 'otherinstances', parent: 'runtime' },
    { text: 'batterypower', parent: 'runtime' },
    { text: 'setscreensaver', parent: 'runtime' },
    { text: 'setscreenpowersaver', parent: 'runtime' },
    { text: 'filemovechunksize', parent: 'runtime' },
    { text: 'ignorewraparoundfragmentation', parent: 'runtime' },
    { text: 'processpriority', parent: 'runtime' },
    { text: 'exittimeout', parent: 'runtime' },
    { text: 'exitiftimeout', parent: 'runtime' },
    { text: 'rememberunmovables', parent: 'runtime' },

    // Disk map zone states
    { text: 'empty', parent: 'setcolor' },
    { text: 'allocated', parent: 'setcolor' },
    { text: 'busyread', parent: 'setcolor' },
    { text: 'busywrite', parent: 'setcolor' },
    { text: 'text', parent: 'setcolor' },

    // Conflict / instance resolution
    { text: 'ask', parent: 'conflict' },
    { text: 'allow', parent: 'conflict' },
    { text: 'kill', parent: 'conflict' },

    // File state flags
    { text: 'movable', parent: 'file_state' },
    { text: 'selected', parent: 'file_state' },
    { text: 'processed', parent: 'file_state' },
    // File state operands
    // All
    // AND
    // OR
    // NOT
    // (...) 
    //#endregion
    //#region Variable and Units
    // Variables
    { text: 'setvariable', parent: 'variable' },
    { text: 'setstatisticswindowtext', parent: 'any' },

    // Logical operators
    { text: 'or', parent: 'operator' },
    { text: 'and', parent: 'operator' },
    { text: 'not', parent: 'operator' },
    { text: 'all', parent: 'operator' },

    // Boolean literals
    { text: 'yes', parent: 'literal' },
    { text: 'no', parent: 'literal' },

    // Time reference keywords
    { text: 'now', parent: 'time' },
    { text: 'ago', parent: 'time' },

    // Time units
    { text: 'time_unit', parent: 'any' },
    { text: 'year', parent: 'time_unit' },
    { text: 'years', parent: 'time_unit' },
    { text: 'month', parent: 'time_unit' },
    { text: 'months', parent: 'time_unit' },
    { text: 'week', parent: 'time_unit' },
    { text: 'weeks', parent: 'time_unit' },
    { text: 'day', parent: 'time_unit' },
    { text: 'days', parent: 'time_unit' },
    { text: 'hour', parent: 'time_unit' },
    { text: 'hours', parent: 'time_unit' },
    { text: 'minute', parent: 'time_unit' },
    { text: 'minutes', parent: 'time_unit' },
    { text: 'second', parent: 'time_unit' },
    { text: 'seconds', parent: 'time_unit' },

    // Arithmetic functions
    { text: 'rounddown', parent: 'math' },
    { text: 'roundup', parent: 'math' },
    { text: 'minimum', parent: 'math' },
    { text: 'maximum', parent: 'math' },

    // Size unit suffixes (SI)
    { text: 'k', parent: 'size_unit' },
    { text: 'm', parent: 'size_unit' },
    { text: 'g', parent: 'size_unit' },
    { text: 't', parent: 'size_unit' },
    { text: 'p', parent: 'size_unit' },
    { text: 'e', parent: 'size_unit' },
    { text: 'z', parent: 'size_unit' },
    { text: 'y', parent: 'size_unit' },

    // Size unit suffixes (byte labels)
    { text: 'kb', parent: 'size_unit' },
    { text: 'mb', parent: 'size_unit' },
    { text: 'gb', parent: 'size_unit' },
    { text: 'tb', parent: 'size_unit' },
    { text: 'pb', parent: 'size_unit' },
    { text: 'eb', parent: 'size_unit' },
    { text: 'zb', parent: 'size_unit' },
    { text: 'yb', parent: 'size_unit' },

    // Size unit suffixes (IEC binary)
    { text: 'ki', parent: 'size_unit' },
    { text: 'mi', parent: 'size_unit' },
    { text: 'gi', parent: 'size_unit' },
    { text: 'ti', parent: 'size_unit' },
    { text: 'pi', parent: 'size_unit' },
    { text: 'ei', parent: 'size_unit' },
    { text: 'zi', parent: 'size_unit' },
    { text: 'yi', parent: 'size_unit' },
    //#endregion
];
// Create a searchable map of keywords (by text, existing)
const KEYWORD_MAP = new Map(KEYWORDS.map(k => [k.text, k]));

// Group keywords by parent for parent-based lookup/iteration
const KEYWORDS_BY_PARENT = new Map();
for (const kw of KEYWORDS) {
    if (!KEYWORDS_BY_PARENT.has(kw.parent)) {
        KEYWORDS_BY_PARENT.set(kw.parent, []);
    }
    KEYWORDS_BY_PARENT.get(kw.parent).push(kw);
}
// ─────────────────────────────────────────────────────────────────────────────────
// Parent functionality (not used at the moment)
function kwGetGroup(group) {
    // Get all size_unit keywords
    const kwGroup = KEYWORDS_BY_PARENT.get(group);
    // → [{ text: 'k', parent: 'size_unit' }, { text: 'm', parent: 'size_unit' }, ...]
    return kwGroup;
}
function kwParentExists(parent) {
    // Check if a parent group exists at all
    KEYWORDS_BY_PARENT.has(parent); // true/false
}
function kwIterateParent(group) {
    // Iterate every parent group
    for (const [parent, keywords] of KEYWORDS_BY_PARENT) {
        console.log(parent, '→', keywords.map(k => k.text));
    }
}
function kwIterateGroup(group) {
    // Iterate just that group
    for (const kw of KEYWORDS_BY_PARENT.get(group) ?? []) {
        console.log(kw.text);
    }
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────
const PREDEFINED_IDENT = [
    // Program and script program_script
    { text: 'MyDefragVersion', units: 'String', parent: 'program_script', category: 'Program and script', description: 'MyDefrag version (for example "MyDefrag v4.0b4")' },
    { text: 'WindowsVersion', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Windows version (for example "v6.0 build 6000")' },
    { text: 'Commandline', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Commandline (for example "MyDefrag.exe -r Weekly.MyD")' },
    { text: 'ExecutableDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Executable directory, the directory where the currently running MyDefrag interpreter is located' },
    { text: 'WorkingDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Working directory' },
    { text: 'ScriptDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Script directory, the directory where the currently running script is located' },
    { text: 'InstallDirectory', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Install directory, where MyDefrag was installed' },
    { text: 'ProcessID', units: 'Number', parent: 'program_script', category: 'Program and script', description: 'Program ID (PID), for example "5816"' },
    { text: 'ScriptTitle', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Script title (see Title)' },
    { text: 'ScriptDescription', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Script description (see Description)' },
    { text: 'Date', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Date "year-month-day", for example "2010-12-31"' },
    { text: 'Time', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Time "hours-minutes-seconds", for example "12:27:01"' },
    { text: 'RunTime', units: 'String', parent: 'program_script', category: 'Program and script', description: 'Elapsed real time (wall-time) since the program started, for example "2:05:18"' },

    // Current volume current_volume
    { text: 'MountPoint', units: 'String', parent: 'current_volume', category: 'Current volume', description: 'Mountpoint (for example "c:")' },
    { text: 'VolumeName', units: 'String', parent: 'current_volume', category: 'Current volume', description: 'VolumeName (for example a GUID-style volume path)' },
    { text: 'VolumeType', units: 'String', parent: 'current_volume', category: 'Current volume', description: 'VolumeType (for example "NTFS")' },
    { text: 'VolumeSize', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The size of the volume' },
    { text: 'VolumeSizeG', units: 'Gigabytes', parent: 'current_volume', category: 'Current volume', description: 'The size of the volume' },
    { text: 'VolumeFree', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of free space on the volume' },
    { text: 'VolumeFreeG', units: 'Gigabytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of free space on the volume' },
    { text: 'VolumeFreeP', units: 'Percentage', parent: 'current_volume', category: 'Current volume', description: 'The amount of free space on the volume' },
    { text: 'VolumeUsed', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of used space on the volume' },
    { text: 'VolumeUsedG', units: 'Gigabytes', parent: 'current_volume', category: 'Current volume', description: 'The amount of used space on the volume' },
    { text: 'VolumeUsedP', units: 'Percentage', parent: 'current_volume', category: 'Current volume', description: 'The amount of used space on the volume' },
    { text: 'MftSize', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The size of the $MFT' },
    { text: 'BytesPerCluster', units: 'bytes', parent: 'current_volume', category: 'Current volume', description: 'The size of a cluster. The minimum size a file will occupy is 1 cluster; very small files on NTFS may be stored in the MFT and reported as zero clusters' },
    { text: 'AverageBeginEndDistance', units: 'Clusters', parent: 'current_volume', category: 'Current volume', description: 'Average end-begin distance between files; a lower number means files are better packed and accessed more quickly. Does not account for disk geometry' },
    { text: 'AverageBeginEndDistanceP', units: 'Percentage', parent: 'current_volume', category: 'Current volume', description: 'Average end-begin distance, as a percentage' },

    // Volume: Files and directories by count volume_files_count
    { text: 'FILES000N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files on the volume' },
    { text: 'FILES000P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files on the volume' },
    { text: 'FILES010N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files on the volume' },
    { text: 'FILES010P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files on the volume' },
    { text: 'FILES020N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files on the volume (fragmented + unfragmented)' },
    { text: 'FILES020P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files on the volume (fragmented + unfragmented)' },
    { text: 'FILES100N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented directories on the volume' },
    { text: 'FILES100P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented directories on the volume' },
    { text: 'FILES110N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented directories on the volume' },
    { text: 'FILES110P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented directories on the volume' },
    { text: 'FILES120N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of directories on the volume (fragmented + unfragmented)' },
    { text: 'FILES120P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of directories on the volume (fragmented + unfragmented)' },
    { text: 'FILES200N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files and directories on the volume' },
    { text: 'FILES200P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of unfragmented files and directories on the volume' },
    { text: 'FILES210N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files and directories on the volume' },
    { text: 'FILES210P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of fragmented files and directories on the volume' },
    { text: 'FILES220N', units: 'Number', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files and directories on the volume (fragmented + unfragmented)' },
    { text: 'FILES220P', units: 'Percentage', parent: 'volume_files_count', category: 'Volume: Files and directories by count', description: 'The number of files and directories on the volume (fragmented + unfragmented)' },

    // Volume: Files and directories by occupied size
    { text: 'FILES002N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES002G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES002P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES012N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES012G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES012P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES022N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented files on the volume' },
    { text: 'FILES022G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented files on the volume' },
    { text: 'FILES022P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented files on the volume' },
    { text: 'FILES102N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented folders on the volume' },
    { text: 'FILES102G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented folders on the volume' },
    { text: 'FILES102P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented folders on the volume' },
    { text: 'FILES112N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented folders on the volume' },
    { text: 'FILES112G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented folders on the volume' },
    { text: 'FILES112P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented folders on the volume' },
    { text: 'FILES122N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented folders on the volume' },
    { text: 'FILES122G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented folders on the volume' },
    { text: 'FILES122P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented + unfragmented folders on the volume' },
    { text: 'FILES202N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented files + folders on the volume' },
    { text: 'FILES202G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented files + folders on the volume' },
    { text: 'FILES202P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the fragmented files + folders on the volume' },
    { text: 'FILES212N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented files + folders on the volume' },
    { text: 'FILES212G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented files + folders on the volume' },
    { text: 'FILES212P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the unfragmented files + folders on the volume' },
    { text: 'FILES222N', units: 'Bytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES222G', units: 'Gigabytes', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES222P', units: 'Percentage', parent: 'volume_files_occupied_size', category: 'Volume: Files and directories by occupied size', description: 'The size of all the files + folders on the volume (fragmented + unfragmented)' },

    // Volume: Files and directories by sparse size
    { text: 'FILES001N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES001G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES001P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of unfragmented files on the volume' },
    { text: 'FILES011N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES011G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES011P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of fragmented files on the volume' },
    { text: 'FILES021N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files on the volume (fragmented + unfragmented)' },
    { text: 'FILES021G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files on the volume (fragmented + unfragmented)' },
    { text: 'FILES021P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files on the volume (fragmented + unfragmented)' },
    { text: 'FILES101N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented folders on the volume' },
    { text: 'FILES101G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented folders on the volume' },
    { text: 'FILES101P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented folders on the volume' },
    { text: 'FILES111N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented folders on the volume' },
    { text: 'FILES111G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented folders on the volume' },
    { text: 'FILES111P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented folders on the volume' },
    { text: 'FILES121N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES121G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES121P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES201N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented files + folders on the volume' },
    { text: 'FILES201G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented files + folders on the volume' },
    { text: 'FILES201P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all unfragmented files + folders on the volume' },
    { text: 'FILES211N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented files + folders on the volume' },
    { text: 'FILES211G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented files + folders on the volume' },
    { text: 'FILES211P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all fragmented files + folders on the volume' },
    { text: 'FILES221N', units: 'Bytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES221G', units: 'Gigabytes', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files + folders on the volume (fragmented + unfragmented)' },
    { text: 'FILES221P', units: 'Percentage', parent: 'volume_files_sparse_size', category: 'Volume: Files and directories by sparse size', description: 'The size of all files + folders on the volume (fragmented + unfragmented)' },

    // Zone
    { text: 'ZoneNumber', units: 'Count', parent: 'zone', category: 'Zone', description: 'The current zone number (for example "3")' },
    { text: 'ZoneCount', units: 'Count', parent: 'zone', category: 'Zone', description: 'The number of zones (for example "6")' },
    { text: 'ProgressPercentage', units: 'Number', parent: 'zone', category: 'Zone', description: 'The percentage as shown in the status bar, progress from 0.0000 to 100.0000 for the current zone (floating-point, 4 decimal digits)' },
    { text: 'ZoneBegin', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The beginning of the zone, number of bytes from the beginning of the disk' },
    { text: 'ZoneEnd', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The end of the zone, number of bytes from the beginning of the disk' },
    { text: 'ZoneSize', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The size of the zone, number of bytes occupied by all items in the zone (includes unmovable items)' },
    { text: 'MaxNextZoneBegin', units: 'Bytes', parent: 'zone', category: 'Zone', description: 'The maximum beginning of the next zone — the end of the disk minus the bytes in items not yet placed' },

    // Zone: Files and directories by count
    { text: 'ZONE000N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files in the zone' },
    { text: 'ZONE000P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files in the zone' },
    { text: 'ZONE010N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files in the zone' },
    { text: 'ZONE010P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files in the zone' },
    { text: 'ZONE020N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE020P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE100N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented folders in the zone' },
    { text: 'ZONE100P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented folders in the zone' },
    { text: 'ZONE110N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented folders in the zone' },
    { text: 'ZONE110P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented folders in the zone' },
    { text: 'ZONE120N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE120P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE200N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files + folders in the zone' },
    { text: 'ZONE200P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of unfragmented files + folders in the zone' },
    { text: 'ZONE210N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files + folders in the zone' },
    { text: 'ZONE210P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of fragmented files + folders in the zone' },
    { text: 'ZONE220N', units: 'Number', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE220P', units: 'Percentage', parent: 'zone_files_count', category: 'Zone: Files and directories by count', description: 'The number of files + folders in the zone (fragmented + unfragmented)' },

    // Zone: Files and directories by occupied size
    { text: 'ZONE002N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE002G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE002P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE012N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE012G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE012P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE022N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE022G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE022P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE102N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE102G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE102P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE112N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE112G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE112P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE122N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE122G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE122P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE202N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE202G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE202P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE212N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE212G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE212P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE222N', units: 'Bytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE222G', units: 'Gigabytes', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE222P', units: 'Percentage', parent: 'zone_files_occupied_size', category: 'Zone: Files and directories by occupied size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },

    // Zone: Files and directories by sparse size
    { text: 'ZONE001N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE001G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE001P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files in the zone' },
    { text: 'ZONE011N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE011G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE011P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files in the zone' },
    { text: 'ZONE021N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE021G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE021P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files in the zone (fragmented + unfragmented)' },
    { text: 'ZONE101N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE101G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE101P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented folders in the zone' },
    { text: 'ZONE111N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE111G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE111P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented folders in the zone' },
    { text: 'ZONE121N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE121G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE121P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE201N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE201G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE201P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of unfragmented files + folders in the zone' },
    { text: 'ZONE211N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE211G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE211P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of fragmented files + folders in the zone' },
    { text: 'ZONE221N', units: 'Bytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE221G', units: 'Gigabytes', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },
    { text: 'ZONE221P', units: 'Percentage', parent: 'zone_files_sparse_size', category: 'Zone: Files and directories by sparse size', description: 'The size of all files + folders in the zone (fragmented + unfragmented)' },

    // Gaps by count
    { text: 'GAP01N', units: 'Count', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP01P', units: 'Percentage', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP02N', units: 'Count', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP02P', units: 'Percentage', parent: 'gaps_count', category: 'Gaps by count', description: 'The number of big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP00N', units: 'Count', parent: 'gaps_count', category: 'Gaps by count', description: 'All gaps' },
    { text: 'GAP00P', units: 'Percentage', parent: 'gaps_count', category: 'Gaps by count', description: 'All gaps' },

    // Gaps by size
    { text: 'GAP11N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP11G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP11P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the small gaps (smaller than the average gap size, GAP13N)' },
    { text: 'GAP12N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP12G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP12P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the big gaps (bigger than the average gap size, GAP13N)' },
    { text: 'GAP10N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of all the gaps' },
    { text: 'GAP10G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of all the gaps' },
    { text: 'GAP10P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of all the gaps' },
    { text: 'GAP13N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The average gap size' },
    { text: 'GAP13G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The average gap size' },
    { text: 'GAP13P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The average gap size' },
    { text: 'GAP14N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The median gap size — the gap in the middle of the sorted list, half the gaps are smaller and half are bigger' },
    { text: 'GAP14G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The median gap size — the gap in the middle of the sorted list, half the gaps are smaller and half are bigger' },
    { text: 'GAP14P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The median gap size — the gap in the middle of the sorted list, half the gaps are smaller and half are bigger' },
    { text: 'GAP15N', units: 'Bytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the biggest gap' },
    { text: 'GAP15G', units: 'Gigabytes', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the biggest gap' },
    { text: 'GAP15P', units: 'Percentage', parent: 'gaps_size', category: 'Gaps by size', description: 'The size of the biggest gap' },

    // Unmovable items
    { text: 'UnmovablesList', units: 'List', parent: 'unmovable_items', category: 'Unmovable items', description: 'List of unmovable items. Fixed format, 1 line per item with fragments, sparse bytes, occupied clusters, and full path' },
    { text: 'UnmovablesTotalFragments', units: 'Count', parent: 'unmovable_items', category: 'Unmovable items', description: 'Total of the "fragments" column' },
    { text: 'UnmovablesTotalBytes', units: 'Bytes', parent: 'unmovable_items', category: 'Unmovable items', description: 'Total of the "bytes" column' },
    { text: 'UnmovablesTotalClusters', units: 'Clusters', parent: 'unmovable_items', category: 'Unmovable items', description: 'Total of the "clusters" column' },

    // Fragmented items
    { text: 'FragmentedList', units: 'List', parent: 'fragmented_items', category: 'Fragmented items', description: 'List of fragmented items. Fixed format, 1 line per item with fragments, sparse bytes, occupied clusters, and full path' },
    { text: 'FragmentedTotalFragments', units: 'Count', parent: 'fragmented_items', category: 'Fragmented items', description: 'Total of the "fragments" column' },
    { text: 'FragmentedTotalBytes', units: 'Bytes', parent: 'fragmented_items', category: 'Fragmented items', description: 'Total of the "bytes" column' },
    { text: 'FragmentedTotalClusters', units: 'Clusters', parent: 'fragmented_items', category: 'Fragmented items', description: 'Total of the "clusters" column' },

    // The 25 largest items
    { text: 'LargestItemsList', units: 'List', parent: 'largest_items', category: 'The 25 largest items', description: 'List of the 25 largest items on the volume. Fixed format, 1 line per item with fragments, sparse bytes, occupied clusters, and full path' },
    { text: 'LargestItemsTotalFragments', units: 'Count', parent: 'largest_items', category: 'The 25 largest items', description: 'Total of the "fragments" column' },
    { text: 'LargestItemsTotalBytes', units: 'Bytes', parent: 'largest_items', category: 'The 25 largest items', description: 'Total of the "bytes" column' },
    { text: 'LargestItemsTotalClusters', units: 'Clusters', parent: 'largest_items', category: 'The 25 largest items', description: 'Total of the "clusters" column' },

    // Bad cluster list
    { text: 'BadClusterList', units: 'List', parent: 'bad_cluster_list', category: 'Bad cluster list', description: 'List of bad clusters. Fixed format, 1 line per block of clusters with number of clusters and LCN (Logical Cluster Number)' },
    { text: 'BadClusterTotal', units: 'Count', parent: 'bad_cluster_list', category: 'Bad cluster list', description: 'Total of the "clusters" column' },

    // Memory usage
    { text: 'MemoryHeapBytes', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Heap memory' },
    { text: 'MemoryHeapItems', units: 'Count', parent: 'memory_usage', category: 'Memory usage', description: 'Heap items' },
    { text: 'MemoryVolumes', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Volumes' },
    { text: 'MemoryItems', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Items (files, directories)' },
    { text: 'MemoryFileNames', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Filenames' },
    { text: 'MemoryFullPaths', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'FullPaths' },
    { text: 'MemoryExtends', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Extends (fragments)' },
    { text: 'MemoryContext', units: 'Bytes', parent: 'memory_usage', category: 'Memory usage', description: 'Context' },
];
function isPredefinedIdentifier(variable) {
    // MyDefrag has a long list of pre-defined variables that you can use. 
    // They are dynamic variables, that is, they are automatically recalculated when they are used.
    // The parent keys used (16 total, matching the 16 source headings):
    // program_script
    // current_volume
    // volume_files_count
    // volume_files_occupied_size
    // volume_files_sparse_size
    // zone
    // zone_files_count
    // zone_files_occupied_size
    // zone_files_sparse_size
    // gaps_count
    // gaps_size
    // unmovable_items
    // fragmented_items
    // largest_items
    // bad_cluster_list
    // memory_usage
    const found = PREDEFINED_IDENT.find(v => v.text === variable);
    return found ?? null;
}
//#endregion
// ─────────────────────────────────────────────────────────────────────────────────
//#region Module Exports
module.exports = {
    KEYWORDS,
    KEYWORD_MAP,
    KEYWORDS_BY_PARENT,
    kwGetGroup,
    kwParentExists,
    kwIterateParent,
    kwIterateGroup,
    PREDEFINED_IDENT,
    isPredefinedIdentifier,
};
//#endregion

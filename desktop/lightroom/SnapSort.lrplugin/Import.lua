local files = import 'LrDialogs'.runOpenPanel {
    title = 'Choose a SnapSort transfer', canChooseFiles = true,
    canChooseDirectories = false, allowsMultipleSelection = false,
    fileTypes = {'tsv'},
}
if files and files[1] then
    dofile(import 'LrPathUtils'.child(_PLUGIN.path, 'Transfer.lua')).run(files[1])
end

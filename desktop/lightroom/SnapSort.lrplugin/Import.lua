local Paths = import 'LrPathUtils'
local file = import 'LrFileUtils'.readFile(Paths.child(_PLUGIN.path, 'pending-transfer.txt'))
if file and file ~= '' then
    dofile(Paths.child(_PLUGIN.path, 'Transfer.lua')).run(file)
else
    import 'LrDialogs'.message('SnapSort', 'Choose your photos in SnapSort, then click Add to Lightroom first.', 'info')
end

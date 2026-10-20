local transfer = dofile(import 'LrPathUtils'.child(_PLUGIN.path, 'Transfer.lua'))
return { URLHandler = function(url)
    local file = url:match('^lightroom://com%.snapsort%.bridge/import%?file=([^&]+)$')
    if file then transfer.run(transfer.decode(file)) end
end }

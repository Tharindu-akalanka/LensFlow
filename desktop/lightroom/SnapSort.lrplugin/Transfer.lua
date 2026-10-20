local Tasks = import 'LrTasks'
local Files = import 'LrFileUtils'
local Dialogs = import 'LrDialogs'
local Application = import 'LrApplication'
local Progress = import 'LrProgressScope'
local M = {}
function M.decode(value)
    return (value:gsub('%%(%x%x)',function(hex) return string.char(tonumber(hex,16)) end))
end
local function encode(value)
    return (tostring(value):gsub('[^%w%-_%.~]',function(c) return string.format('%%%02X',string.byte(c)) end))
end
function M.parse(text)
    assert(#text <= 20*1024*1024,'Transfer is too large')
    local lines = {}
    for line in (text..'\n'):gmatch('(.-)\n') do lines[#lines+1]=line:gsub('\r$','') end
    assert(lines[1]=='SNAPSORT_TRANSFER_1','This is not a SnapSort transfer')
    local id,name = lines[2]:match('^([^\t]+)\t([^\t]+)$')
    assert(id and name,'Project details are missing')
    id,name = M.decode(id),M.decode(name)
    assert(id:match('^%x+$') and #id==32,'Invalid project identifier')
    local photos = {}
    for i=3,#lines do
        if lines[i]~='' then
            local source,category,rating = lines[i]:match('^([^\t]+)\t([^\t]+)\t([^\t]+)$')
            assert(source and category and rating,'Invalid photo row')
            source,category,rating=M.decode(source),M.decode(category),tonumber(M.decode(rating))
            assert(source:match('^%a:[/\\]') or source:match('^/'),'Expected an absolute photo path')
            assert(not source:find('%z') and not source:find('[\r\n]'),'Invalid path')
            assert(({keep=true,reject=true,pick=true,review=true,other=true})[category],'Invalid category')
            assert(rating and rating>=0 and rating<=5 and rating==math.floor(rating),'Invalid rating')
            photos[#photos+1]={source=source,category=category,rating=rating}
        end
    end
    assert(#photos>0 and #photos<=20000,'Expected 1–20,000 photos')
    return {id=id,name=name,photos=photos}
end
function M.run(file)
    if not file:match('%.snapsort%-transfer%.tsv$') then
        Dialogs.message('SnapSort','Choose the transfer file created by SnapSort.','warning'); return
    end
    if _G.snapSortImportActive then Dialogs.message('SnapSort','Another transfer is still running.'); return end
    _G.snapSortImportActive=true
    Tasks.startAsyncTask(function()
        local added,existing,failed,total,catalogName=0,0,0,0,''
        local errors={}
        local progress
        local function report(state)
            local lines={state,tostring(added),tostring(existing),tostring(failed),tostring(total),encode(catalogName)}
            for _,e in ipairs(errors) do lines[#lines+1]=encode(e) end
            local handle=assert(io.open(file..'.status','w'))
            handle:write(table.concat(lines,'\n')); handle:close()
        end
        local ok,err=Tasks.pcall(function()
            local project=M.parse(assert(Files.readFile(file),'Transfer file is missing'))
            local catalog=Application.activeCatalog()
            local function write(name,fn)
                local result=catalog:withWriteAccessDo(name,fn,{timeout=30})
                assert(result=='executed','Lightroom catalog is busy. Try again when its current task finishes.')
            end
            catalogName=catalog:getPath()
            total=#project.photos
            report('confirming')
            if Dialogs.confirm('Add '..total..' photos to Lightroom?',project.name..'\nCatalog: '..catalogName..'\nExisting edits and ratings are preserved. SnapSort collections will be updated.','Add photos','Cancel')~='ok' then
                report('cancelled'); return
            end
            progress=Progress{title='Adding '..project.name..' from SnapSort'}
            local collections,lists={}, {all={},pick={},review={},keep={},reject={}}
            write('Create SnapSort collections',function()
                local parent=catalog:createCollectionSet('SnapSort · '..project.name..' ['..project.id:sub(1,8)..']',nil,true)
                for key,title in pairs({all='All Photos',pick='SnapSort Picks',review='Needs Review',keep='Keepers',reject='Rejected by You'}) do
                    collections[key]=catalog:createCollection(title,parent,true)
                end
            end)
            report('running')
            for index,row in ipairs(project.photos) do
                if progress:isCanceled() then report('cancelled'); return end
                local success,message=Tasks.pcall(function()
                    assert(Files.exists(row.source)=='file','Original file is unavailable')
                    write('Add SnapSort photo',function()
                        local photo=catalog:findPhotoByPath(row.source)
                        local wasExisting=photo~=nil
                        if not photo then
                            photo=assert(catalog:addPhoto(row.source),'Lightroom could not add this file')
                            if row.rating>0 then photo:setRawMetadata('rating',row.rating) end
                            local label=({keep='green',pick='green',review='yellow',reject='red'})[row.category]
                            if label then photo:setRawMetadata('colorNameForLabel',label) end
                        end
                        lists.all[#lists.all+1]=photo
                        if lists[row.category] then lists[row.category][#lists[row.category]+1]=photo end
                        if row.category=='review' then lists.pick[#lists.pick+1]=photo end
                        -- Each successful photo is visible even if a transfer is cancelled.
                        collections.all:addPhotos({photo})
                        if wasExisting then existing=existing+1 else added=added+1 end
                    end)
                end)
                if not success then failed=failed+1;errors[#errors+1]=row.source..': '..tostring(message) end
                progress:setPortionComplete(index,total)
                progress:setCaption(index..' / '..total..' processed')
                if index%10==0 or index==total then report('running') end
            end
            write('Update SnapSort selections',function()
                for key,collection in pairs(collections) do
                    collection:removePhotos(collection:getPhotos())
                    if #lists[key]>0 then collection:addPhotos(lists[key]) end
                end
            end)
            catalog:setActiveSources({collections.pick})
            report('complete')
        end)
        if progress then progress:done() end
        if not ok then
            errors[#errors+1]=tostring(err)
            Tasks.pcall(function() report('failed') end)
            Dialogs.message('SnapSort transfer needs attention',tostring(err),'warning')
        end
        _G.snapSortImportActive=false
    end)
end
return M

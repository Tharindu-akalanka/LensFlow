"""Lua protocol/SDK-contract tests. These do not replace real Lightroom testing."""
from pathlib import Path
import tempfile
import unittest
from urllib.parse import quote
from lupa import LuaRuntime

PLUGIN=Path(__file__).resolve().parents[1]/'lightroom'/'SnapSort.lrplugin'
MOCKS=r'''
catalogPhotos={}; collections={}; choice='ok'; cancelled=false; messages={}; added=0
modules={}
modules.LrTasks={startAsyncTask=function(fn) fn() end,pcall=pcall}
modules.LrFileUtils={readFile=function() return fixture end,exists=function(p) if p:find('missing') then return false end;return 'file' end}
modules.LrDialogs={confirm=function() return choice end,message=function(...) messages[#messages+1]={...} end}
modules.LrProgressScope=function() return {isCanceled=function() return cancelled end,setPortionComplete=function() end,setCaption=function() end,done=function() end} end
local function collection()
 return {photos={},addPhotos=function(self,photos) for _,p in ipairs(photos) do self.photos[#self.photos+1]=p end end,
 getPhotos=function(self) return self.photos end,removePhotos=function(self) self.photos={} end}
end
catalog={getPath=function() return 'C:/Test catalog.lrcat' end,
 withWriteAccessDo=function(self,name,fn) fn();return 'executed' end,
 createCollectionSet=function() return {} end,
 createCollection=function(self,name) collections[name]=collections[name] or collection();return collections[name] end,
 findPhotoByPath=function(self,path) return catalogPhotos[path] end,
 addPhoto=function(self,path) local photo={metadata={}};function photo:setRawMetadata(key,value) self.metadata[key]=value end;catalogPhotos[path]=photo;added=added+1;return photo end,
 setActiveSources=function(self,values) activeSources=values end}
modules.LrApplication={activeCatalog=function() return catalog end}
import=function(name) return assert(modules[name],name) end
'''

class PluginTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=PLUGIN.parents[1]/'.build')
        self.file=str(Path(self.temp.name)/'test.snapsort-transfer.tsv')
        self.lua=LuaRuntime(unpack_returned_tuples=True)
        self.lua.execute(MOCKS)
        self.module=self.lua.execute((PLUGIN/'Transfer.lua').read_text())
        self.lua.globals().fixture='SNAPSORT_TRANSFER_1\n'+'a'*32+'\tPortrait%20caf%C3%A9\nC%3A%2Fphoto.jpg\tpick\t4\nC%3A%2Fmissing.jpg\treview\t4'
    def tearDown(self):self.temp.cleanup()
    def state(self):return Path(self.file+'.status').read_text().splitlines()
    def test_import_retry_preserves_existing_metadata_and_collections(self):
        self.module.run(self.file)
        self.assertEqual(self.state()[:5],['complete','1','0','1','2'])
        self.lua.execute("catalogPhotos['C:/photo.jpg'].metadata.rating=2")
        self.module.run(self.file)
        self.assertEqual(self.state()[:5],['complete','0','1','1','2'])
        self.assertEqual(self.lua.eval("catalogPhotos['C:/photo.jpg'].metadata.rating"),2)
        self.assertEqual(self.lua.eval("#collections['SnapSort Picks'].photos"),1)
    def test_cancel_does_not_add_photos(self):
        self.lua.globals().choice='cancel';self.module.run(self.file)
        self.assertEqual(self.state()[0],'cancelled')
        self.assertEqual(self.lua.globals().added,0)
    def test_invalid_protocol_is_refused(self):
        self.lua.globals().fixture='return os.execute("bad")';self.module.run(self.file)
        self.assertEqual(self.state()[0],'failed')
        self.assertEqual(self.lua.globals().added,0)
    def test_invalid_suffix_cannot_start_import(self):
        self.module.run(self.file+'.lua');self.assertEqual(self.lua.globals().added,0)
        self.assertFalse(Path(self.file+'.status').exists())
    def test_all_lua_files_parse(self):
        for file in PLUGIN.glob('*.lua'):
            self.assertIsNotNone(self.lua.eval('load')(file.read_text()))
    def test_changed_selection_removes_stale_pick(self):
        self.module.run(self.file)
        self.lua.globals().fixture=self.lua.globals().fixture.replace('\tpick\t4','\treject\t0')
        self.module.run(self.file)
        self.assertEqual(self.lua.eval("#collections['SnapSort Picks'].photos"),0)
        self.assertEqual(self.lua.eval("#collections['Rejected by You'].photos"),1)

if __name__=='__main__':unittest.main()

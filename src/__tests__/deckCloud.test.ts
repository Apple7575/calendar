jest.mock("../lib/supabase", () => ({supabase:{auth:{getUser:jest.fn(),getSession:jest.fn()},storage:{from:jest.fn()}}}));
import { supabase } from "../lib/supabase";
import { publishDeck, receiveDecks } from "../lib/deckCloud";
import sample from "../../assets/decks/n3-reading-01.json";

const upload = jest.fn(), list = jest.fn(), createSignedUrl = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  (supabase.storage.from as jest.Mock).mockReturnValue({upload,list,createSignedUrl});
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({data:{user:{id:"owner"}},error:null});
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({data:{session:{user:{id:"owner"}}},error:null});
});
afterEach(()=>{global.fetch=originalFetch});
it("publishes to the authenticated owner's private prefix without overwriting files", async () => {
  upload.mockResolvedValue({error:null});
  await publishDeck({...sample,user_id:"someone-else"});
  expect(supabase.storage.from).toHaveBeenCalledWith("diary-photos");
  expect(upload).toHaveBeenCalledWith(`owner/study-decks-v2/${sample.id}--${sample.revision}.json`, expect.any(String), {contentType:"application/json",upsert:false});
});
it("explains an account change without querying another account's storage", async () => {
  await expect(receiveDecks("other")).rejects.toThrow("앱 계정이 바뀌었어요");
  expect(list).not.toHaveBeenCalled();
});
it("asks a signed-out user to connect Google before receiving decks", async () => {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({data:{session:null},error:null});
  await expect(receiveDecks("owner")).rejects.toThrow("구글 계정을 먼저 연결");
  expect(list).not.toHaveBeenCalled();
});
it("accepts sending identical content twice but refuses changing the same revision", async () => {
  upload.mockResolvedValue({error:{statusCode:"409",message:"already exists"}});
  createSignedUrl.mockResolvedValue({data:{signedUrl:"https://example.test/private-deck"},error:null});
  global.fetch=jest.fn().mockResolvedValue({ok:true,text:async()=>JSON.stringify(sample)});
  await expect(publishDeck(sample)).resolves.toMatchObject({id:sample.id});
  await expect(publishDeck({...sample,name:"changed"})).rejects.toThrow("revision");
});
it("downloads only signed private deck paths and rejects mismatched content IDs", async () => {
  list.mockImplementation(async(path:string)=>({data:path.endsWith('study-decks-v2')?[]:[{id:"1",name:"hk-n3-kanji-01--20261029_01.json",created_at:"2026-10-29"},{id:"2",name:"../outside.json"}],error:null}));
  createSignedUrl.mockResolvedValue({data:{signedUrl:"https://example.test/private-deck"},error:null});
  global.fetch=jest.fn().mockResolvedValue({ok:true,text:async()=>JSON.stringify(sample)});
  expect((await receiveDecks("owner"))[0].notes).toHaveLength(49);
  expect(createSignedUrl).toHaveBeenCalledWith("owner/study-decks/hk-n3-kanji-01--20261029_01.json",60);
  expect(createSignedUrl).toHaveBeenCalledTimes(1);
  global.fetch=jest.fn().mockResolvedValue({ok:true,text:async()=>JSON.stringify({...sample,id:"different"})});
  await expect(receiveDecks("owner")).rejects.toThrow("ID");
});
it('prefers media-capable delivery over a newer legacy compatibility deck',async()=>{
 list.mockImplementation(async(prefix:string)=>({data:[{id:'f',name:`${sample.id}--${prefix.endsWith('-v2')?'full':'legacy'}.json`,created_at:prefix.endsWith('-v2')?'2026-10-30':'2026-10-31'}],error:null}));
 createSignedUrl.mockImplementation(async(file:string)=>({data:{signedUrl:`https://example.test/${file.includes('study-decks-v2')?'full':'legacy'}`},error:null}));
 global.fetch=jest.fn().mockImplementation(async(url:string)=>({ok:true,text:async()=>JSON.stringify({...sample,revision:url.endsWith('/full')?'full':'legacy'})}));
 const result=await receiveDecks('owner');expect(result).toHaveLength(1);expect(result[0].revision).toBe('full');expect(createSignedUrl).toHaveBeenCalledTimes(1);expect(createSignedUrl).toHaveBeenCalledWith(`owner/study-decks-v2/${sample.id}--full.json`,60);
});

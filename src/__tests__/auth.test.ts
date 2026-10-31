jest.mock("expo-auth-session", () => ({makeRedirectUri:()=>"calendar://"}));
jest.mock("expo-auth-session/build/QueryParams", () => ({getQueryParams:jest.fn()}));
jest.mock("expo-web-browser", () => ({maybeCompleteAuthSession:jest.fn(),openAuthSessionAsync:jest.fn()}));
jest.mock("../lib/googleTokens", () => ({clearTokenCache:jest.fn(),primeProviderToken:jest.fn(),saveRefreshToken:jest.fn()}));
jest.mock("../hooks/useGoogleEvents", () => ({invalidateGoogleCache:jest.fn()}));
jest.mock("../lib/supabase", () => ({supabase:{auth:{getSession:jest.fn(),signInWithOAuth:jest.fn(),exchangeCodeForSession:jest.fn(),signOut:jest.fn()}}}));
import * as Browser from "expo-web-browser";
import * as Params from "expo-auth-session/build/QueryParams";
import { supabase } from "../lib/supabase";
import { clearTokenCache, primeProviderToken } from "../lib/googleTokens";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";
import { signInWithGoogle, signOut } from "../lib/auth";
beforeEach(()=>{
  jest.clearAllMocks();
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({data:{session:{user:{id:"old"}}}});
  (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({data:{url:"https://example.test/oauth"},error:null});
  (Browser.openAuthSessionAsync as jest.Mock).mockResolvedValue({type:"success",url:"calendar://?code=test"});
  (Params.getQueryParams as jest.Mock).mockReturnValue({params:{code:"test"}});
  (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({data:{session:{user:{id:"new"},provider_token:"new-provider"}},error:null});
});
it("opens the Google account chooser and replaces cached calendar credentials after switching",async()=>{
  await expect(signInWithGoogle({selectAccount:true})).resolves.toEqual({canceled:false});
  expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({options:expect.objectContaining({queryParams:{access_type:"offline",prompt:"select_account consent"}})}));
  expect(clearTokenCache).toHaveBeenCalledTimes(1);
  expect(invalidateGoogleCache).toHaveBeenCalledTimes(1);
  expect(primeProviderToken).toHaveBeenCalledWith("new-provider",3600);
});
it("preserves the current account if the chooser is canceled",async()=>{
  (Browser.openAuthSessionAsync as jest.Mock).mockResolvedValue({type:"cancel"});
  await expect(signInWithGoogle({selectAccount:true})).resolves.toEqual({canceled:true});
  expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(clearTokenCache).not.toHaveBeenCalled();
  expect(supabase.auth.signOut).not.toHaveBeenCalled();
});
it("signs out this device without ending the computer's session",async()=>{
  (supabase.auth.signOut as jest.Mock).mockResolvedValue({error:null});
  await signOut();
  expect(supabase.auth.signOut).toHaveBeenCalledWith({scope:"local"});
  expect(clearTokenCache).toHaveBeenCalledTimes(1);
});

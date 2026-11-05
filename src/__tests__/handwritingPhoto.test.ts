import {handwritingPhotoActions,portraitTurn} from '../lib/handwritingPhoto';

/** Sizes as the picker reports them, after the saved direction is applied. A 12MP sensor is 4032 x 3024. */
const wide={width:4032,height:3024},tall={width:3024,height:4032};

describe('a note photo always comes out as held upright',()=>{
 test('already upright stays untouched',()=>{
  expect(portraitTurn({...tall,exif:{Orientation:6}})).toBe(0);
 });
 test('saved as landscape with the top to the left turns clockwise',()=>{
  expect(portraitTurn({...wide,exif:{Orientation:1}})).toBe(90);
 });
 test('saved as landscape with the top to the right turns the other way',()=>{
  expect(portraitTurn({...wide,exif:{Orientation:3}})).toBe(270);
 });
 test('saved upside down turns over',()=>{
  expect(portraitTurn({...tall,exif:{Orientation:8}})).toBe(180);
 });
 test.each([[undefined],[null],[{}],[{Orientation:'x'}],[{Orientation:2}]])('with no usable direction %j only a wide photo turns',exif=>{
  expect(portraitTurn({...wide,exif})).toBe(90);
  expect(portraitTurn({...tall,exif})).toBe(0);
 });
});

describe('the steps before saving',()=>{
 test('an upright photo under the limit has no steps',()=>{
  expect(handwritingPhotoActions({width:1500,height:2000,exif:{Orientation:6}})).toEqual([]);
 });
 test('an upright large photo shrinks by its height',()=>{
  expect(handwritingPhotoActions({...tall,exif:{Orientation:6}})).toEqual([{resize:{height:2200}}]);
 });
 test('a wide large photo turns first, then shrinks by what is now its height',()=>{
  expect(handwritingPhotoActions({...wide,exif:{Orientation:1}})).toEqual([{rotate:90},{resize:{height:2200}}]);
 });
 test('a wide small photo only turns',()=>{
  expect(handwritingPhotoActions({width:2000,height:1500,exif:{Orientation:3}})).toEqual([{rotate:270}]);
 });
 test('a square photo with no direction is left alone',()=>{
  expect(handwritingPhotoActions({width:1000,height:1000})).toEqual([]);
 });
});

describe('the camera asks for the saved direction',()=>{
 test('the screen requests it and uses these steps',()=>{
  const fs=require('fs'),path=require('path');
  const source=fs.readFileSync(path.join(__dirname,'../features/routine/HandwritingStudy.tsx'),'utf8') as string;
  expect(source).toContain("launchCameraAsync({mediaTypes:['images'],quality:1,exif:true})");
  expect(source).toContain('manipulateAsync(asset.uri,handwritingPhotoActions(asset),');
 });
});

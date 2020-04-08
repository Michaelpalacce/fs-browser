'use strict';

const { test, assert, runAllTests }	= require( 'event_request' ).Testing;
const FileSystem					= require( '../src/file_system' );
const path							= require( 'path' );

test({
	message	: 'FileSystem.constructor on defaults',
	test	: ( done )=>{
		const fs	= new FileSystem();

		assert.equal( fs.defaultLimit, 50 );
		assert.equal( fs.safeMode, true );

		done();
	}
});

test({
	message	: 'FileSystem.constructor on changes',
	test	: ( done )=>{
		const fs	= new FileSystem( 25, false );

		assert.equal( fs.defaultLimit, 25 );
		assert.equal( fs.safeMode, false );

		done();
	}
});

test({
	message			: 'FileSystem.sanitizeToken sanitizesToken correctly',
	dataProvider	: [
		['', { finishedDirectories: false, finishedFiles: false, hasMore: true, position: 0 }],
		['{"finishedDirectories":false,"finishedFiles":false,"hasMore":true,"position":0}', { finishedDirectories: false, finishedFiles: false, hasMore: true, position: 0 }],
		['{"finishedDirectories":false,"finishedFiles":false,"hasMore":true,"position":50}', { finishedDirectories: false, finishedFiles: false, hasMore: true, position: 50 }],
		['{"finishedDirectories":true,"finishedFiles":false,"hasMore":false,"position":50}', { finishedDirectories: true, finishedFiles: false, hasMore: false, position: 50 }],
		[{ finishedDirectories: true, finishedFiles: false, hasMore: false, position: 50 }, { finishedDirectories: true, finishedFiles: false, hasMore: false, position: 50 }],
	],
	test			: ( done, nextToken, expected )=>{
		const fs	= new FileSystem();

		assert.deepStrictEqual( fs.sanitizeToken( nextToken ), expected );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItems gets items correctly',
	test	: async ( done )=>{
		const fs		= new FileSystem();

		const result	= await fs.getAllItems( path.join( __dirname, './fixture/data' ) );

		assert.equal( result.items.length, 50 );
		assert.equal( result.nextToken, '{"position":45,"hasMore":true,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( result.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItems with pagination',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/data' );

		const firstPage			= await fs.getAllItems( fixtureDir, '', 10 );

		const expectedFirstPage	= [
			path.join( fixtureDir, 'folder0' ),
			path.join( fixtureDir, 'folder1' ),
			path.join( fixtureDir, 'folder2' ),
			path.join( fixtureDir, 'folder3' ),
			path.join( fixtureDir, 'folder4' ),
			path.join( fixtureDir, 'file0' ),
			path.join( fixtureDir, 'file1' ),
			path.join( fixtureDir, 'file10' ),
			path.join( fixtureDir, 'file11' ),
			path.join( fixtureDir, 'file12' ),
		];

		const expectedSecondPage	= [
			path.join( fixtureDir, 'file13' ),
			path.join( fixtureDir, 'file14' ),
			path.join( fixtureDir, 'file15' ),
			path.join( fixtureDir, 'file16' ),
			path.join( fixtureDir, 'file17' ),
			path.join( fixtureDir, 'file18' ),
			path.join( fixtureDir, 'file19' ),
			path.join( fixtureDir, 'file2' ),
			path.join( fixtureDir, 'file20' ),
			path.join( fixtureDir, 'file21' )
		];

		assert.equal( firstPage.items.length, 10 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":5,"hasMore":true,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		const secondPage			= await fs.getAllItems( fixtureDir, firstPage.nextToken, 10 );

		assert.equal( secondPage.items.length, 10 );
		assert.deepStrictEqual( secondPage.items, expectedSecondPage );
		assert.equal( secondPage.nextToken, '{"position":15,"hasMore":true,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( secondPage.hasMore, true );

		const lastPage				= await fs.getAllItems( fixtureDir, secondPage.nextToken, 100 );

		assert.equal( lastPage.items.length, 85 );
		assert.equal( lastPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":true}' );
		assert.equal( lastPage.hasMore, false );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItemsAtOnce',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/data' );
		const firstPage			= await fs.getAllItems( fixtureDir, '', -1 );

		assert.equal( firstPage.items.length, 105 );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":true}' );
		assert.equal( firstPage.hasMore, false );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItemsDirsAtLimit',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/data' );
		const firstPage			= await fs.getAllItems( fixtureDir, '', 5 );
		const expectedFirstPage	= [
			path.join( fixtureDir, 'folder0' ),
			path.join( fixtureDir, 'folder1' ),
			path.join( fixtureDir, 'folder2' ),
			path.join( fixtureDir, 'folder3' ),
			path.join( fixtureDir, 'folder4' )
		];

		assert.equal( firstPage.items.length, 5 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":true,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItemsDirsAtExactLimit',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/data' );
		const firstPage			= await fs.getAllItems( fixtureDir, '', 105 );

		assert.equal( firstPage.items.length, 105 );
		assert.equal( firstPage.nextToken, '{"position":100,"hasMore":true,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItemsOneOverLimit',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/data' );
		const firstPage			= await fs.getAllItems( fixtureDir, '', 106 );

		assert.equal( firstPage.items.length, 105 );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":true}' );
		assert.equal( firstPage.hasMore, false );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItemsWithTokenThatIsEOD',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/data' );
		const firstPage			= await fs.getAllItems( fixtureDir, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":true}', 5 );
		const expectedFirstPage	= [];

		assert.equal( firstPage.items.length, 0 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":true}' );
		assert.equal( firstPage.hasMore, false );

		done();
	}
});

test({
	message	: 'FileSystem.getAllItemsWhenYouCannotAccessFolder',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/nonExisting' );
		const firstPage			= await fs.getAllItems( fixtureDir, '' );
		const expectedFirstPage	= [];

		assert.equal( firstPage.items.length, 0 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getDirectoriesWhenYouCannotAccessFolder',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/nonExisting' );
		const firstPage			= await fs.getDirectories( fixtureDir, '' );
		const expectedFirstPage	= [];

		assert.equal( firstPage.items.length, 0 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getFilesWhenYouCannotAccessFolder',
	test	: async ( done )=>{
		const fs				= new FileSystem();
		const fixtureDir		= path.join( __dirname, './fixture/nonExisting' );
		const firstPage			= await fs.getFiles( fixtureDir, '' );
		const expectedFirstPage	= [];

		assert.equal( firstPage.items.length, 0 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.tokenCanBePassedAround',
	test	: async ( done )=>{
		const fs					= new FileSystem();
		const fixtureDir			= path.join( __dirname, './fixture/data' );
		const firstPage				= await fs.getDirectories( fixtureDir, '' );
		const expectedFirstPage		= [
			path.join( fixtureDir, 'folder0' ),
			path.join( fixtureDir, 'folder1' ),
			path.join( fixtureDir, 'folder2' ),
			path.join( fixtureDir, 'folder3' ),
			path.join( fixtureDir, 'folder4' ),
		];

		const expectedSecondPage	= [
			path.join( fixtureDir, 'file0' ),
			path.join( fixtureDir, 'file1' ),
			path.join( fixtureDir, 'file10' ),
			path.join( fixtureDir, 'file11' ),
			path.join( fixtureDir, 'file12' ),
		];

		assert.equal( firstPage.items.length, 5 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, false );

		const secondPage	= await fs.getFiles( fixtureDir, firstPage.nextToken, 5 );

		assert.equal( secondPage.items.length, 5 );
		assert.deepStrictEqual( secondPage.items, expectedSecondPage );
		assert.equal( secondPage.nextToken, '{"position":5,"hasMore":true,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( secondPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getDirectories gets directories',
	test	: async ( done )=>{
		const fs					= new FileSystem();
		const fixtureDir			= path.join( __dirname, './fixture/data' );
		const firstPage				= await fs.getDirectories( fixtureDir, '' );
		const expectedFirstPage		= [
			path.join( fixtureDir, 'folder0' ),
			path.join( fixtureDir, 'folder1' ),
			path.join( fixtureDir, 'folder2' ),
			path.join( fixtureDir, 'folder3' ),
			path.join( fixtureDir, 'folder4' ),
		];

		assert.equal( firstPage.items.length, 5 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, false );

		done();
	}
});

test({
	message	: 'FileSystem.getDirectories gets directories with pagination',
	test	: async ( done )=>{
		const fs					= new FileSystem();
		const fixtureDir			= path.join( __dirname, './fixture/data' );
		const firstPage				= await fs.getDirectories( fixtureDir, '', 2 );
		const expectedFirstPage		= [
			path.join( fixtureDir, 'folder0' ),
			path.join( fixtureDir, 'folder1' )
		];
		const expectedSecondPage		= [
			path.join( fixtureDir, 'folder2' ),
			path.join( fixtureDir, 'folder3' ),
		];
		const expectedThirdPage		= [
			path.join( fixtureDir, 'folder4' ),
		];

		assert.equal( firstPage.items.length, 2 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":2,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		const secondPage				= await fs.getDirectories( fixtureDir, firstPage.nextToken, 2 );

		assert.equal( secondPage.items.length, 2 );
		assert.deepStrictEqual( secondPage.items, expectedSecondPage );
		assert.equal( secondPage.nextToken, '{"position":4,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( secondPage.hasMore, true );

		const thirdPage					= await fs.getDirectories( fixtureDir, secondPage.nextToken, 2 );

		assert.equal( thirdPage.items.length, 1 );
		assert.deepStrictEqual( thirdPage.items, expectedThirdPage );
		assert.equal( thirdPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":true,"finishedFiles":false}' );
		assert.equal( thirdPage.hasMore, false );

		done();
	}
});

test({
	message	: 'FileSystem.getFiles gets files',
	test	: async ( done )=>{
		const fs					= new FileSystem();
		const fixtureDir			= path.join( __dirname, './fixture/data' );
		const firstPage				= await fs.getFiles( fixtureDir, '', 5 );
		const expectedFirstPage		= [
			path.join( fixtureDir, 'file0' ),
			path.join( fixtureDir, 'file1' ),
			path.join( fixtureDir, 'file10' ),
			path.join( fixtureDir, 'file11' ),
			path.join( fixtureDir, 'file12' ),
		];

		assert.equal( firstPage.items.length, 5 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":5,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		done();
	}
});

test({
	message	: 'FileSystem.getFiles gets files with pagination',
	test	: async ( done )=>{
		const fs					= new FileSystem();
		const fixtureDir			= path.join( __dirname, './fixture/data' );
		const firstPage				= await fs.getFiles( fixtureDir, '', 2 );
		const expectedFirstPage		= [
			path.join( fixtureDir, 'file0' ),
			path.join( fixtureDir, 'file1' )
		];
		const expectedSecondPage		= [
			path.join( fixtureDir, 'file10' ),
			path.join( fixtureDir, 'file11' ),
		];

		assert.equal( firstPage.items.length, 2 );
		assert.deepStrictEqual( firstPage.items, expectedFirstPage );
		assert.equal( firstPage.nextToken, '{"position":2,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( firstPage.hasMore, true );

		const secondPage				= await fs.getFiles( fixtureDir, firstPage.nextToken, 2 );

		assert.equal( secondPage.items.length, 2 );
		assert.deepStrictEqual( secondPage.items, expectedSecondPage );
		assert.equal( secondPage.nextToken, '{"position":4,"hasMore":true,"finishedDirectories":false,"finishedFiles":false}' );
		assert.equal( secondPage.hasMore, true );

		const thirdPage					= await fs.getFiles( fixtureDir, secondPage.nextToken, -1 );

		assert.equal( thirdPage.items.length, 96 );
		assert.equal( thirdPage.nextToken, '{"position":0,"hasMore":false,"finishedDirectories":false,"finishedFiles":true}' );
		assert.equal( thirdPage.hasMore, false );

		done();
	}
});

runAllTests();

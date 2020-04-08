'use strict';

// Dependencies
const { opendir, stat }	= require( 'fs' ).promises;
const { join }			= require( 'path' );

/**
 * @brief	Default page size if none is given
 *
 * @var		Number
 */
const DEFAULT_LIMIT		= 50;

/**
 * @brief	Class that helps us paginate browsing through the file system
 */
class FileSystem
{
	/**
	 * @details	defaultLimit will be the default page size when fetching items
	 * 			safeMode allows you to fetch only items that node has access to and can open.
	 * 			For Example node will not be able to access some files of the system, like system files
	 *
	 * @param	defaultLimit Number
	 * @param	safeMode Boolean
	 */
	constructor( defaultLimit = DEFAULT_LIMIT, safeMode = true )
	{
		this.defaultLimit	= defaultLimit;
		this.safeMode		= safeMode;
	}

	/**
	 * @brief	Gets a token in a correct format
	 *
	 * @param	token mixed
	 *
	 * @returns	Object
	 */
	sanitizeToken( token = '' )
	{
		if ( typeof token === 'string' )
		{
			if ( token === '' )
			{
				return { position: 0, hasMore: true, finishedDirectories: false, finishedFiles: false };
			}

			return JSON.parse( token );
		}

		return token;
	}

	/**
	 * @brief	Gets both directories and files, with the directories being first
	 *
	 * @return	Promise
	 */
	async getAllItems( directory, nextToken = '', limit = this.defaultLimit )
	{
		nextToken		= this.sanitizeToken( nextToken );
		let adjustableLimit	= limit;
		let items			= [];

		if ( nextToken.finishedDirectories === false )
		{
			const response	= await this.getDirectories( directory, nextToken, adjustableLimit ).catch(()=>{ return false; });

			if ( response !== false )
			{
				nextToken		= JSON.parse( response.nextToken );

				adjustableLimit	-= response.items.length;
				items			= [...items, ...response.items];

				if ( items.length <= limit || limit === -1 )
				{
					nextToken.hasMore	= true;
				}
			}
		}

		if ( nextToken.finishedDirectories === true && nextToken.finishedFiles === false )
		{
			const response	= await this.getFiles( directory, nextToken, adjustableLimit ).catch( ()=>{ return false; } );

			if ( response !== false )
			{
				nextToken		= JSON.parse( response.nextToken );
				items			= [...items, ...response.items];
			}
		}

		return {
			items,
			nextToken	: JSON.stringify( nextToken ),
			hasMore		: nextToken.hasMore
		}
	}

	/**
	 * @brief	Gets the directories with pagination
	 *
	 * @param	directory String
	 * @param	nextToken mixed
	 * @param	limit Number
	 *
	 * @return	Promise
	 */
	async getDirectories( directory, nextToken = '', limit = this.defaultLimit )
	{
		const directoriesResponse	= await this._getItems( directory, true, nextToken, limit ).catch( ()=>{ return false; } );

		if ( directoriesResponse === false )
		{
			return {
				items		: [],
				nextToken	: JSON.stringify( this.sanitizeToken( nextToken ) ),
				hasMore		: true
			};
		}

		if ( directoriesResponse.hasMore === false )
		{
			directoriesResponse.nextToken.finishedDirectories	= true;
			directoriesResponse.nextToken.position				= 0;
		}

		directoriesResponse.nextToken	= JSON.stringify( directoriesResponse.nextToken );

		return directoriesResponse;
	}

	/**
	 * @brief	Gets the files with pagination
	 *
	 * @param	directory String
	 * @param	nextToken mixed
	 * @param	limit Number
	 *
	 * @return	Promise
	 */
	async getFiles( directory, nextToken = '', limit = this.defaultLimit )
	{
		const filesResponse	= await this._getItems( directory, false, nextToken, limit ).catch( ()=>{ return false; } );

		if ( filesResponse === false )
		{
			return {
				items		: [],
				nextToken	: JSON.stringify( this.sanitizeToken( nextToken ) ),
				hasMore		: true
			};
		}

		if ( filesResponse.hasMore === false )
		{
			filesResponse.nextToken.finishedFiles	= true;
			filesResponse.nextToken.position		= 0;
		}

		filesResponse.nextToken	= JSON.stringify( filesResponse.nextToken );

		return filesResponse;
	}

	/**
	 * @brief	Gets either folders or files according to a token
	 *
	 * @param	directory String
	 * @param	isDir Boolean
	 * @param	nextToken mixed
	 * @param	limit Number
	 *
	 * @return	Promise
	 */
	async _getItems( directory, isDir, nextToken = '', limit = this.defaultLimit )
	{
		nextToken														= this.sanitizeToken( nextToken );
		let { position, hasMore, finishedDirectories, finishedFiles }	= nextToken;

		// Don't do anything, old token was EOD
		if ( hasMore === false )
		{
			if ( finishedDirectories && isDir || finishedFiles && ! isDir )
				return { nextToken, hasMore, items : [] };
		}

		let items	= [];
		let count	= 0;
		hasMore		= false;

		const dir	= await opendir( directory );
		for await ( const item of dir )
		{
			// If we've reached the limit break
			if ( items.length === limit && limit !== -1 )
			{
				hasMore	= true;
				break;
			}

			const absItemName	= join( directory, item.name );

			if ( this.safeMode )
			{
				// Ignore ones we don't have permissions for
				const stats	= await stat( absItemName ).catch(()=>{
					return false;
				});

				if ( stats === false )
					continue
			}

			if ( item.isDirectory() === isDir )
			{
				count ++;
				// Skip to a higher position
				if ( count <= position )
				{
					continue;
				}

				// Add items
				items.push( absItemName );
			}
		}

		nextToken.position	= items.length + position;
		nextToken.hasMore	= hasMore && ( ! finishedFiles || ! finishedDirectories );

		return { nextToken, items, hasMore };
	}
}

module.exports	= FileSystem;

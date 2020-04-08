# fs-browser
A package that allows you to paginate the file system. The items will always be fetched in order of folders first and after that the files.

# Usage:

### Constructor options

**constructor( defaultLimit = DEFAULT_LIMIT, safeMode = true )**
- defaultLimit is by default how big a page will be ( if no limit is explicitly passed in the other methods )
- safeMode - if this is set to true then only files that can be accessed by node will be returned 
- Safe Mode check: await stat( absItemName ).catch( ()=>{ return false; } );

### Exported Functions:

**async getAllItems( String directory, mixed nextToken = '', Number limit = this.defaultLimit ): Promise: Object**
- If next token is End Of Data (EOD) token, there will be no operations done and the response will be returned with EOD and hasMore set to false
- You can set the limit to -1 in which case all items will be fetched
- Directory is the absolute or relative path to the folder you want to browse
- nextToken should be passed only if you have one from before
- limit is the amount of items to fetch
- Folders will be fetched first and after that the files
- returned promise will be resolved to { nextToken: String, items: Array, hasMore: Boolean }
- nextToken should be passed to the next time getAllItems is called
- items is going to be an array of absolute item names
- hasMore is going to be a flag if there is more data

**async getDirectories( String directory, mixed nextToken = '', Number limit = this.defaultLimit ): Promise: Object**
- The same as getAllItems but hasMore will be false if End Of Data is reached for the folders
- Only directories will be fetched

**async getFiles( String directory, mixed nextToken = '', Number limit = this.defaultLimit ): Promise: Object**
- The same as getAllItems but hasMore will be false if End Of Data is reached for the files
- Only files will be fetched

### Notes:
- nextToken can successfully be passed around the different methods but you won't get the full amount of data if the previous method is fully finished fetching data. This behaviour is discouraged
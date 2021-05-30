import { JsonStream } from './json-stream'
import { DerivedUser, SubClass, TestUser } from './mocks/test-user'
import { Model } from './model'
import { Store } from './store'
import testData from './mocks/mock-data.json'

describe( 'Model', ()=>{
	let model: Model< TestUser >
	let testUser: TestUser
	const rawData = ()=> ( Store.dataSource as JsonStream ).rawData 

	beforeEach(()=> {
		Store.useDataSource( new JsonStream( JSON.parse( JSON.stringify( testData ) ) ) )
		
		testUser = new TestUser()
		testUser.name = {
			firstName: 'testUserFirstName',
			lastName: 'testUserLastName'
		}
		testUser.age = 35
		testUser.skills = [ 'lazy', 'dirty' ]
		
		model = Store.getModel<TestUser>( 'TestUser' )
	})

	it( 'should get model from class name string and class instance', ()=>{
		expect( 
			Store.getModel( testUser ).collectionName 
		).toEqual( model.collectionName )

		expect( model.collectionName ).toEqual( 'TestUser' )
	})

	it( 'should find document by id', async ()=>{
		const user = await model.findById( 'user1' )

		expect( user ).toBeInstanceOf( TestUser )
		expect( user.id ).toEqual( 'user1' )
		expect( user.name.firstName ).toEqual( 'userFirstName1' )
	})

	it( 'should not throw if a document id doesn\'t exists', ( done )=>{
		expect( ()=>{
			model.findById( 'nonExistingId' )
				.then( done )
				.catch( done )
		}).not.toThrow()
	})
	
	it( 'should return undefined if a document id doesn\'t exists', async ()=>{
		expect( await model.findById( 'nonExistingId' ) ).toBeUndefined()
	})
	
	it( 'should return empty array if no document matches condition', async ()=>{
		expect( await model.find().where( 'age', '<', 0 ).get() ).toHaveLength( 0 )
	})

	it( 'should return all documents if no where specified', async ()=>{
		const docs = await model.find().get()
		expect( docs.length ).toBeGreaterThan( 1 )
	})
	

	it( 'should write a document', async ()=>{
		await model.save( testUser )

		expect( rawData()[ 'TestUser' ][ testUser.id ] ).toEqual(	expect.objectContaining({ 
			name: { 
				firstName: 'testUserFirstName',
				lastName: 'testUserLastName'
			}
		}))
	})	
	
	it( 'should delete a document by id', async ()=>{
		expect( rawData()[ 'TestUser' ][ 'user1'] ).toBeDefined()
		await model.delete( 'user1' )

		expect( rawData()[ 'TestUser' ][ 'user1' ] ).toBeUndefined()
	})

	describe( 'Generic find', ()=>{
		it( 'should query all admins with query object', async ()=>{
			const admins = await model.query({
				operations: {
					admin: {
						operator: '==',
						value: true
					}
				}
			})

			expect( admins[0] ).toBeInstanceOf( TestUser )
			expect( admins ).toHaveLength( 2 )
		})

		it( 'should find all admins with where methods', async ()=>{
			const admins = await model.find().where( 'admin', '==', true ).get()

			expect( admins[0] ).toBeInstanceOf( TestUser )
			expect( admins ).toHaveLength( 2 )
		})

		it( 'should find admins with age less than 56', async ()=>{
			const admins = await model.find()
				.where( 'admin', '==', true )
				.where( 'age', '<', 50 )
				.get()

			expect( admins ).toHaveLength( 1 )
			expect( admins[0].age ).toBeLessThan( 50 )
		})

		it( 'should query by subproperties', async ()=>{
			const users = await model.query({
				operations: {
					name: {
						operator: '==',
						value: { firstName: 'userFirstName3' }
					},
					age: {
						operator: '!=', value: 134
					}

				}
			})

			expect( users[0].id ).toBe( 'user3' )
		})

		it( 'should find by subproperties', async ()=>{
			const users = await model.find()
				.where( 'name', '==', { firstName: 'userFirstName3' })
				.get()

			expect( users[0].id ).toBe( 'user3' )
		})
		
	})

	describe( 'Derived classes should fit on parent collection', ()=>{

		it( 'should save derived object in parent collection', async ()=>{
			const derived = new DerivedUser()
			derived.name = { firstName: 'Fulanito', lastName: 'Derived' }
			derived.salary = 3900

			await model.save( derived )

			expect( rawData()[ 'TestUser' ][ derived.id ][ 'salary' ] ).toBe( 3900 )
			expect( rawData()[ 'TestUser' ][ derived.id ][ '__className' ] ).toEqual( 'DerivedUser' )
		})

		it( 'should retrieve derived object by id ', async ()=>{
			const derived = await model.findById( 'user4' )

			expect( derived ).toBeInstanceOf( DerivedUser )
			expect( ( derived as DerivedUser ).salary ).toBe( 2800 )
		})
		
		
	})

	describe( 'References to documents', ()=>{
		let ref1: SubClass, ref2: SubClass

		beforeEach( async ()=>{
			testUser.documentRef = new SubClass()
			testUser.documentRef.year = 2045	
			ref1 = new SubClass(); ref1.year = 2081
			ref2 = new SubClass(); ref2.year = 2082
			testUser.manyRefs.push( ref1 )
			testUser.manyRefs.push( ref2 )
			await model.save( testUser )
		})

		it( 'should save a document as a reference', async ()=>{
			expect( rawData()[ 'SubClass' ] ).toBeDefined()
			expect( rawData()[ 'SubClass' ][ testUser.documentRef.id ] ).toEqual(
				expect.objectContaining({
					__className: 'SubClass',
					year: 2045
				})
			)
		})

		it( 'should read a swallow document reference', async ()=>{
			const loadedUser = await model.findById( testUser.id )

			expect( loadedUser.documentRef ).toBeInstanceOf( SubClass )
			expect( loadedUser.documentRef.id ).toEqual( testUser.documentRef.id )
			expect( loadedUser.documentRef.year ).toBeUndefined()
			expect( loadedUser.documentRef.wasLoaded ).toBeFalsy()
		})

		it( 'should fill data of swallow document reference', async ()=>{
			const loadedUser = await model.findById( testUser.id )

			await Store.populate( loadedUser.documentRef )
			expect( loadedUser.documentRef.wasLoaded ).toBeTruthy()
			expect( loadedUser.documentRef.year ).toBe( 2045 )
		})

		it( 'should save and array of references', ()=>{
			expect( rawData()[ 'SubClass' ][ ref1.id ] ).toBeDefined()
			expect( rawData()[ 'SubClass' ][ ref1.id ][ 'year'] ).toBe( 2081 )			
			expect( rawData()[ 'SubClass' ][ ref2.id ] ).toBeDefined()
			expect( rawData()[ 'SubClass' ][ ref2.id ][ 'year'] ).toBe( 2082 )			
		})

		it( 'should read an array of references', async ()=>{
			const loadedUser = await model.findById( testUser.id )
			
			expect( loadedUser.manyRefs ).toHaveLength( 2 )
			expect( loadedUser.manyRefs[0] ).toBeInstanceOf( SubClass )
			expect( loadedUser.manyRefs ).toEqual( expect.arrayContaining([
				expect.objectContaining({ id: ref1.id }),
				expect.objectContaining({ id: ref2.id })
			]))
			expect( loadedUser.manyRefs[0].year ).toBeUndefined()
		})

		it( 'should fill array of refs', async ()=>{
			const loadedUser = await model.findById( testUser.id )
			await Store.populate( loadedUser.manyRefs )

			expect( loadedUser.manyRefs[0].year ).toBe( 2081 )
			expect( loadedUser.manyRefs[1].year ).toBe( 2082 )
		})
	})

	describe( 'Operations on queries', ()=>{
		it( 'should limit the result set', async ()=>{
			const unlimited = await model.find().get()
			const limited = await model.find().limit( 2 ).get()

			expect( unlimited.length ).not.toBe( limited.length )
			expect( limited ).toHaveLength( 2 )
		})

		it( 'should sort ascending the result set', async ()=>{
			const docs = await model.find().orderBy( 'age' ).get()

			expect( docs[0].id ).toEqual( 'user2' )
			expect( docs[1].id ).toEqual( 'user1' )
		})
		
		it( 'should sort descending the result set', async ()=>{
			const docs = await model.find().orderBy( 'age', 'desc' ).get()

			expect( docs[0].id ).toEqual( 'user3' )
			expect( docs[1].id ).toEqual( 'user4' )
		})
		
	})
})

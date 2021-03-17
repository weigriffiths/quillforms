/**
 * QuillForms Dependencies
 */
import { getBlockType } from '@quillforms/blocks';
import type { FormBlocks, FormBlock } from '@quillforms/config';

/**
 * WordPress Dependencies
 */
import { select } from '@wordpress/data';

/**
 * External Dependencies
 */
import { forEach, map, findIndex, slice } from 'lodash';
import createSelector from 'rememo';

/**
 * Internal Dependencies
 */
import type { BlockEditorState, FormBlockWithOrder, BlockOrder } from './types';
/**
 * Returns all block objects.
 *
 * Note: it's important to memoize this selector to avoid return a new instance on each call. We use the block cache state
 * for each top-level block of the given block id. This way, the selector only refreshes
 * on changes to blocks associated with the given entity
 *
 * @param {BlockEditorState}  state        Editor state.
 *
 * @return {FormBlocks} Form blocks.
 */
export const getBlocks = createSelector(
	( state: BlockEditorState ): FormBlocks => {
		return state.blocks;
	},
	( state: BlockEditorState ) =>
		map( state.blocks, ( block ) => state?.cache?.[ block.id ] )
);

/**
 * Get welcome screens length.
 *
 * @param {BlockEditorState}   state       Global application state.
 *
 * @return {number} Welcome screens length
 */
export function getWelcomeScreensLength( state: BlockEditorState ): number {
	return state.blocks.filter( ( block ) => block.name === 'welcome-screen' )
		.length;
}

/**
 * Get block by id
 *
 * @param {BlockEditorState} 	state      Global application state.
 * @param {string}  id		   Block id
 *
 * @return {FormBlock} Block object
 */
export const getBlockById = createSelector(
	( state: BlockEditorState, blockId: string ): FormBlock | undefined => {
		const block = state.blocks.find( ( $block ) => $block.id === blockId );
		if ( ! block ) return undefined;
		return block;
	},
	( state: BlockEditorState, blockId: string ) => [
		// Normally, we'd have both `getBlockAttributes` dependencies and
		// `getBlocks` (children) dependancies here but for performance reasons
		// we use a denormalized cache key computed in the reducer that takes both
		// the attributes and inner blocks into account. The value of the cache key
		// is being changed whenever one of these dependencies is out of date.
		state?.cache?.[ blockId ],
	]
);

/**
 * Get block order by id
 *
 * @param {BlockEditorState} 	state      Global application state.
 * @param {string}  id		   Block id
 *
 * @return {BlockOrder} Block order
 */
export const getBlockOrderById = (
	state: BlockEditorState,
	id: string
): BlockOrder => {
	const formBlock = getBlockById( state, id );
	if ( ! formBlock ) return undefined;
	const blockType = select( 'quillForms/blocks' ).getBlockTypes()[
		formBlock.name
	];
	const editableFields = select(
		'quillForms/block-editor'
	).getEditableFields();
	const charCode = 'a'.charCodeAt( 0 );

	// Simple algorithm to generate alphabatical idented order
	const identName = ( a: number ): string => {
		const b = [ a ];
		let sp, out, i, div;

		sp = 0;
		while ( sp < b.length ) {
			if ( b[ sp ] > 25 ) {
				div = Math.floor( b[ sp ] / 26 );
				b[ sp + 1 ] = div - 1;
				b[ sp ] %= 26;
			}
			sp += 1;
		}

		out = '';
		for ( i = 0; i < b.length; i += 1 ) {
			out = String.fromCharCode( charCode + b[ i ] ) + out;
		}

		return out.toUpperCase();
	};

	let itemOrder: BlockOrder;
	if ( blockType.supports.editable === true ) {
		const fieldIndex = editableFields.findIndex(
			( field ) => field.id === id
		);
		itemOrder = fieldIndex + 1;
	} else {
		const fieldIndex = state.blocks
			.filter( ( block ) => block.name === formBlock.name )
			.findIndex( ( block ) => block.id === id );
		itemOrder = identName( fieldIndex );
	}
	return itemOrder;
};

/**
 * Retruns the editable blocks -- Editable blocks are the blocks who have {editable} setting equals true
 *
 * @param {BlockEditorState} state       Global application state.
 *
 * @return {FormBlock[]} Editable fields
 */
export function getEditableFields( state: BlockEditorState ): FormBlock[] {
	const blocks = getBlocks( state );
	return blocks.filter( ( block ) => {
		const blockType = select( 'quillForms/blocks' ).getBlockTypes()[
			block.name
		];
		return blockType.supports.editable === true;
	} );
}

// /**
//  * @typedef {Object} QFBlocksSupportsCriteria
//  *
//  * @property {boolean} editable        Is block editable.
//  * @property {boolean} logic 	       Does block support jump logic.
//  * @property {boolean} required        Does block support required flag.
//  * @property {boolean} attachment      Does block support attachment.
//  * @property {boolean} description     Does block support description.
//  */
// /**
//  * Get block with multiple criteria.
//  *
//  * @param {Object}                    state       Global application state.
//  * @param {QFBlocksSupportsCriteria}  criteria    Multiple criteria according to which the blocks are filtered.
//  *
//  * @return {Array} Filtered blocks according to criteria given
//  */
// export const getBlocksByCriteria = ( state:, criteria ) => {
// 	const blocks = select( 'quillForms/block-editor' ).getBlocks();
// 	const filteredCriteria = pick( criteria, [
// 		'logic',
// 		'required',
// 		'attachment',
// 		'description',
// 		'editable',
// 	] );

// 	return blocks.filter( ( block ) => {
// 		const blockType = select( 'quillForms/blocks' ).getBlockTypes()[
// 			block.name
// 		];
// 		return Object.entries( filteredCriteria ).every( ( [ key, val ] ) =>
// 			typeof val === 'boolean' ? blockType.supports[ key ] === val : true
// 		);
// 	} );
// };

/**
 * Retruns the previous editable fields
 * Editable fields are the fields which have {editable} property equals true
 *
 * @param {BlockEditorState} state    Global application state.
 * @param {string} 			 id       The block id.
 *
 * @return {FormBlockWithOrder[]} Previous editable fields
 */
export const getPreviousEditableFieldsWithOrder = createSelector(
	( state: BlockEditorState, id: string ): FormBlockWithOrder[] => {
		const prevEditableFields: FormBlockWithOrder[] = [];

		const blocks = getBlocks( state );

		const blockIndex = findIndex( blocks, ( block ) => block.id === id );
		if ( blockIndex > 0 ) {
			const prevFormBlocks = slice( blocks, 0, blockIndex );
			forEach( prevFormBlocks, ( block ) => {
				const blockType = getBlockType( block.name );
				if ( blockType?.supports?.editable ) {
					prevEditableFields.push( {
						...block,
						order: getBlockOrderById( state, block.id ),
					} );
				}
			} );
		}
		return prevEditableFields;
	},
	( state: BlockEditorState ) =>
		map( state.blocks, ( block ) => state?.cache?.[ block.id ] )
);

/**
 * Retruns the editable fields length
 *
 * @param {BlockEditorState} state       Global application state.
 *
 * @return {number} Editable fields length
 */
export function getEditableFieldsLength( state: BlockEditorState ): number {
	return getEditableFields( state ).length;
}

/**
 * Returns the current block id
 *
 * @param {BlockEditorState} state       Global application state.
 *
 * @return {?string} Current block id
 */
export function getCurrentBlockId(
	state: BlockEditorState
): string | undefined {
	return state.currentBlockId;
}

/**
 * Returns the current block index
 *
 * @param {BlockEditorState} state       Global application state.
 *
 * @return {number} Current block index
 */
export function getCurrentBlockIndex( state: BlockEditorState ): number {
	return state.blocks.findIndex(
		( item ) => item.id === state.currentBlockId
	);
}

/**
 * Returns the current form item
 *
 * @param {BlockEditorState} state     Global application state.
 *
 * @return {FormBlock} Current block item
 */
export function getCurrentBlock(
	state: BlockEditorState
): FormBlock | undefined {
	let currentBlock;
	const currentBlockIndex = state.blocks.findIndex(
		( item ) => item.id === state.currentBlockId
	);
	if ( currentBlockIndex !== -1 )
		currentBlock = state.blocks[ currentBlockIndex ];
	return currentBlock;
}

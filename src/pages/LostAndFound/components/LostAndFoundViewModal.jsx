import React, { useEffect, useState } from 'react';
import { Modal, Button, Table } from 'react-bootstrap';
import axios from 'axios';
import MessageModal from '../../Messages/components/MessageModal';
function LostAndFoundViewModal({ showModal, setShowModal, selectedItem, claimData = [], fetchItems }) {
    useEffect(() => {
        // Optional: You can do side effects here when selectedItem or claimData changes
    }, [selectedItem, claimData]);
    console.log(selectedItem, claimData);
    const [showMessageInputModal, setShowMessageInputModal] = useState(false);
    const [updatedSelectedItem, setUpdatedSelectedItem] = useState(selectedItem);
    
    const handleAcceptClaim = async (claim) => {
        try {
            // Ensure that all necessary data is being sent in the request body
            const response = await axios.put(
                `http://localhost:5000/api/lostandfound/item/accept-claim`,
                {
                    item_id: claim.item_id,
                    holder_id: claim.holder_id,
                    claimer_id: claim.claimer_id,
                }
            );
    
            if (response.data.success) {
                console.log('Claim accepted successfully.');
                setShowModal(false);
            } else {
                console.error('Failed to accept claim.');
            }
        } catch (error) {
            console.error('Error accepting claim:', error.response?.data || error.message);
        }
    };

    const handleRejectClaim = (claimId) => {
        console.log(`Rejecting claim with id: ${claimId}`);
        // Add reject claim logic here
    };

    const handleCloseMessageModal = () => {
        setShowMessageInputModal(false);
    };
    const handleMessage = (itemId) => {

        const claim = claimData.find(claim => claim.item_id === itemId); // Find the claim associated with the item
        if (claim) {
            const updatedItem = { ...selectedItem, user_id: claim.claimer_id }; // Update selectedItem with claimer_id
            setUpdatedSelectedItem(updatedItem); // Update the state with the modified selectedItem
        }
        setShowMessageInputModal(true);
    };
    return (
        <>
        <Modal show={showModal} onHide={() => setShowModal(false)} centered size="xl">
            <Modal.Header closeButton>
                <Modal.Title>Item Details & Claim Requests</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {selectedItem ? (
                    <>
                        <p><strong>Date:</strong> {new Date(selectedItem.date_reported).toLocaleString()}</p>
                        <p><strong>Reported By:</strong> {selectedItem.user_name}</p>
                        <p><strong>Location:</strong> {selectedItem.location}</p>
                        <p><strong>Type:</strong> {selectedItem.type}</p>
                        <p><strong>Description:</strong> {selectedItem.description}</p>
                        {selectedItem.image_path && (
                            <img
                                src={`${import.meta.env.VITE_IMAGES}/${selectedItem.image_path}`}
                                alt="Item"
                                className="img-fluid mb-3"
                                style={{ maxHeight: '300px', borderRadius: '10px' }}
                            />
                        )}
                        <hr />
                        <h5>Claim Requests</h5>
                        {claimData.length > 0 ? (
                            <Table bordered hover>
                                <thead>
                                    <tr>
                                        <th>Claimer Name</th>
                                        <th>Message</th>
                                        <th>Claimed On</th>
                                        <th className='justify-content-center align-items-center'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claimData.map((claim) => (
                                        <tr key={claim.id}>
                                            <td>{claim.claimer_name}</td>
                                            <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '300px' }}>
                                                {claim.description}
                                            </td>
                                            <td>{new Date(claim.created_at).toLocaleString()}</td>
                                            <td className="d-flex flex-column flex-sm-row justify-content-around">
                                                {/* Accept Button */}
                                                <button
                                                    className="btn btn-primary btn-sm rounded-0 mb-2 mb-sm-0"
                                                    onClick={() => handleAcceptClaim(claim)}
                                                >
                                                    Accept
                                                </button>
                                                {/* Reject Button */}
                                                <button
                                                    className="btn btn-danger btn-sm rounded-0"
                                                    onClick={() => handleRejectClaim(claim.id)}
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    className="btn btn-info btn-sm rounded-0 mt-2 mt-sm-0"
                                                    onClick={() => handleMessage(claim.item_id)}
                                                >
                                                    Message
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p>No claims found for this item.</p>
                        )}
                    </>
                ) : (
                    <p>No item selected.</p>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" className="rounded-0" onClick={() => setShowModal(false)}>Close</Button>
            </Modal.Footer>
        </Modal>

            <MessageModal
            show={showMessageInputModal}
            handleClose={handleCloseMessageModal}
            existingItem={updatedSelectedItem}
            fetchItems={fetchItems}
            />
        
        </>
    );
}

export default LostAndFoundViewModal;

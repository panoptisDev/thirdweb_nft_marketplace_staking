import {
  useContract,
  useNetwork,
  useNetworkMismatch,
  useAddress,
  useSDK,
  useCreateDirectListing,
  useCreateAuctionListing,
} from "@thirdweb-dev/react";
import { ChainId, NATIVE_TOKEN_ADDRESS } from "@thirdweb-dev/sdk";
import {
  Badge,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  Input,
  Container
} from '@chakra-ui/react';import React, { useState } from "react";
import { NFT_COLLECTION_ADDRESS, MARKETPLACE_ADDRESS } from "../const/contractAddresses";
import { useRouter } from "next/router";
import { useContext, useRef } from "react";
import styles from "../styles/Theme.module.css";

const activeChainId = parseInt(`${process.env.NEXT_PUBLIC_CHAIN_ID}`)
const OpenseaName = process.env.NEXT_PUBLIC_OPENSEA_NAME

const Upload = () => {
  const address = useAddress();
  const networkMismatch = useNetworkMismatch();
  const [, switchNetwork] = useNetwork();
  const sdk = useSDK();

  const alert = useToast()

  const [creatingListing, setCreatingListing] = useState(false);

  const { contract: nftCollection } = useContract(
    NFT_COLLECTION_ADDRESS,
    "nft-collection"
  );
  const { contract: marketplace } = useContract(
    MARKETPLACE_ADDRESS,
    "marketplace"
  );

  const { mutateAsync: makeDirectListing } =
    useCreateDirectListing(marketplace);
  const { mutateAsync: makeAuctionListing } =
    useCreateAuctionListing(marketplace);

  // Other hooks
  const router = useRouter();
  const [file, setFile] = useState();
  const fileInputRef = useRef(null);
  

  // This function gets called when the form is submitted.
  async function handleCreateListing(e) {
    setCreatingListing(true);
    try {
      // Prevent page from refreshing
      e.preventDefault();

      // De-construct data from form submission
      const { listingType, name, description, price } = e.target.elements;

      console.log({
        listingType: listingType.value,
        name: name.value,
        description: description.value,
        price: price.value,
      });

      // Ensure user is on the correct network
      if (networkMismatch) {
        switchNetwork?.(activeChainId);
        return;
      }

      // Upload image using storage SDK
      const img = await sdk.storage.upload(file);

      // Signature Mint NFT, get info (fetch generate mint signature)
      const req = await fetch("/api/generate-mint-signature", {
        method: "POST",
        body: JSON.stringify({
          address,
          name: e.target.elements.name.value,
          description: e.target.elements.description.value,
          image: img,
        }),
      });

      const signedPayload = (await req.json()).signedPayload;

      const nft = await nftCollection?.signature.mint(signedPayload);

      const mintedTokenId = nft.id.toNumber();

      // Store the result of either the direct listing creation or the auction listing creation
      let transactionResult = undefined;

      // Depending on the type of listing selected, call the appropriate function
      // For Direct Listings:
      if (listingType.value === "directListing") {
        transactionResult = await createDirectListing(
          NFT_COLLECTION_ADDRESS,
          mintedTokenId,
          price.value
        );
      }

      // For Auction Listings:
      if (listingType.value === "auctionListing") {
        transactionResult = await createAuctionListing(
          NFT_COLLECTION_ADDRESS,
          mintedTokenId,
          price.value
        );
      }

      // If the transaction succeeds, take the user back to the homepage to view their listing!
      if (transactionResult) {
        router.push(`/listings`);
      }
    } catch (error) {
      console.error(error);
      alert({
          title: 'Upload Gagal.',
          description: "Upload NFT gagal. Check the console for more details",
          status: 'error',
          duration: 7000,
          isClosable: true,
        });
    } finally {
      setCreatingListing(false);
    }
  }

  async function createAuctionListing(contractAddress, tokenId, price) {
    try {
      makeAuctionListing(
        {
          assetContractAddress: contractAddress, // Contract Address of the NFT
          buyoutPricePerToken: price, // Maximum price, the auction will end immediately if a user pays this price.
          currencyContractAddress: NATIVE_TOKEN_ADDRESS, // NATIVE_TOKEN_ADDRESS is the crpyto curency that is native to the network. i.e. Goerli ETH.
          listingDurationInSeconds: 60 * 60 * 24 * 7, // When the auction will be closed and no longer accept bids (1 Week)
          quantity: 1, // How many of the NFTs are being listed (useful for ERC 1155 tokens)
          reservePricePerToken: 0, // Minimum price, users cannot bid below this amount
          startTimestamp: new Date(), // When the listing will start
          tokenId: tokenId, // Token ID of the NFT.
        },
        {
          onSuccess: (tx) => {
            return tx;
          },
        }
      );
    } catch (error) {
      console.error(error)
      alert({
          title: 'Error.',
          description: "NFT gagal di upload.",
          status: 'error',
          duration: 7000,
          isClosable: true,
        })
    }
  }

  async function createDirectListing(contractAddress, tokenId, price) {
    try {
      makeDirectListing(
        {
          assetContractAddress: contractAddress, // Contract Address of the NFT
          buyoutPricePerToken: price, // Maximum price, the auction will end immediately if a user pays this price.
          currencyContractAddress: NATIVE_TOKEN_ADDRESS, // NATIVE_TOKEN_ADDRESS is the crpyto curency that is native to the network. i.e. Goerli ETH.
          listingDurationInSeconds: 60 * 60 * 24 * 7, // When the auction will be closed and no longer accept bids (1 Week)
          quantity: 1, // How many of the NFTs are being listed (useful for ERC 1155 tokens)
          startTimestamp: new Date(0), // When the listing will start
          tokenId: tokenId, // Token ID of the NFT.
        },
        {
          onSuccess: (tx) => {
            router.push(`/listings`);
          },
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  // Function to store file in state when user uploads it
  const uploadFile = () => {
    if (fileInputRef?.current) {
      fileInputRef.current.click();

      fileInputRef.current.onchange = () => {
        if (fileInputRef?.current?.files?.length) {
          const file = fileInputRef.current.files[0];
          setFile(file);
        }
      };
    }
  };

  return (
    <form onSubmit={(e) => handleCreateListing(e)}>
	<Container pt={20}>
    <Center py={6}>
      <Stack className={styles.styleStack}
        borderWidth="1px"
        borderRadius="lg"
        w={{ sm: '100%', md: '540px' }}
        height={{ sm: '476px', md: '20rem' }}
        direction={{ base: 'column', md: 'row' }}
        bg={useColorModeValue('white', 'gray.900')}
        boxShadow={'2xl'}
        padding={4}>
        <Flex flex={1} bg="blue.200" style={{borderRadius: 16}}>
          {file ? (
          <Image
		    borderRadius="16px"
            objectFit="cover"
            boxSize="100%"
            src={URL.createObjectURL(file)} alt='upload'
			onClick={() => setFile(undefined)}
          />
          ) : (
            <div
              className={styles.imageInput}
              onClick={uploadFile}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setFile(e.dataTransfer.files[0]);
              }}
            >
              Click or Drag an image here to upload.
            </div>
          )}
        </Flex>
          <Input isRequired
            type="file"
            accept="image/png, image/gif, image/jpeg"
            id="profile-picture-input"
            ref={fileInputRef}
            style={{ display: "none" }}
          />
        <Stack
          flex={1}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          p={1}
          pt={2}>
          <Heading fontSize={'2xl'} fontFamily={'body'}>
            Upload NFT
          </Heading>
          <Text fontWeight={600} color={'gray.500'} size="sm" mb={4}>
            @{OpenseaName}
          </Text>
            <FormControl id="price" isRequired>
          <input
            type="text"
            name="name"
            placeholder="Name"
            className={styles.textInput}
          />
            </FormControl>
            <FormControl id="description" isRequired>
          <input
            type="text"
            name="description"
            placeholder="Description"
            className={styles.textInput}
          />
            </FormControl>
            <FormControl id="price" isRequired>
          <input
            type="text"
            name="price"
            placeholder="Price (in MATIC)"
            className={styles.textInput}
          />
            </FormControl>

          {/* Toggle between direct listing and auction listing */}
          <div className={styles.listingTypeContainer}>
            <input
              type="radio"
              name="listingType"
              id="directListing"
              value="directListing"
              defaultChecked
              className={styles.listingType}
            />
            <label htmlFor="directListing" className={styles.listingTypeLabel}>
              Direct
            </label>
            <input
              type="radio"
              name="listingType"
              id="auctionListing"
              value="auctionListing"
              className={styles.listingType}
            />
            <label htmlFor="auctionListing" className={styles.listingTypeLabel}>
              Auction
            </label>
          </div>
		  
          <Stack
            width={'100%'}
            mt={'2rem'}
            direction={'row'}
            padding={2}
            justifyContent={'space-between'}
            alignItems={'center'}>

        {address ? (
            <Button
			  type="submit"
              flex={1}
              fontSize={'sm'}
              rounded={'full'}
              bg={'blue.400'}
              color={'white'}
              boxShadow={
                '0px 1px 25px -5px rgb(66 153 225 / 48%), 0 10px 10px -5px rgb(66 153 225 / 43%)'
              }
              _hover={{
                bg: 'blue.500',
              }}
              _focus={{
                bg: 'blue.500',
              }}
              disabled={creatingListing}>
{networkMismatch ? (
<>
Switch Network
</>
) : (
<>
            {creatingListing ? "Loading..." : "Mint + List NFT"}
			</>
)}
            </Button>
          ) : (
            <Button
              flex={1}
              fontSize={'sm'}
              rounded={'full'}
			  colorScheme={'red'}
              _focus={{
                bg: 'red.200',
              }}
			disabled> Connect Wallet
            </Button>
		)}
		
          </Stack>
        </Stack>
      </Stack>
    </Center>
	</Container>
    </form>
  );
};

export default Upload;

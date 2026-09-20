import React, { useContext, useEffect, useState, useRef } from 'react';
import { Button, Form, Row, Col, FormLabel, ProgressBar, Alert, Badge } from 'react-bootstrap';
import { Formik, useFormikContext, Field } from 'formik';
import chunk from 'lodash/chunk';
import * as yup from 'yup';
import { Trans, useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { GifReader } from 'omggif';

import { AppContext } from '../Contexts/AppContext';
import FormControl from '../Components/FormControl';
import FormSelect from '../Components/FormSelect';
import Section from '../Components/Section';
import WebApi from '../Services/WebApi';

import { I2C_BLOCKS } from '../Data/Peripherals';

const ON_OFF_OPTIONS = [
	{ label: 'Disabled', value: 0 },
	{ label: 'Enabled', value: 1 },
];

const SPLASH_MODES = [
	{ label: 'Enabled (Custom Splash Screen)', value: 0 }, // STATICSPLASH
	{ label: 'Logo Close In', value: 1 }, // CLOSEIN
	{ label: 'Logo Close In Custom', value: 2 }, // CLOSEINCUSTOM
	{ label: 'Disabled', value: 3 }, // NOSPLASH
];

const DISPLAY_FLIP_MODES = [
	{ label: 'None', value: 0 },
	{ label: 'Flip', value: 1 },
	{ label: 'Mirror', value: 2 },
	{ label: 'Flip and Mirror', value: 3 },
];

const defaultValues = {
	enabled: false,
	i2cAddress: '0x3C',
	i2cBlock: 0,
	flipDisplay: false,
	invertDisplay: false,
	buttonLayout: 0,
	buttonLayoutRight: 3,
	splashDuration: 0,
	splashMode: 3,
	splashImage: Array(16 * 64).fill(0), // 128 columns represented by bytes so 16 and 64 rows
	invertSplash: false,
	buttonLayoutCustomOptions: {
		params: {
			layout: 0,
			startX: 8,
			startY: 28,
			buttonRadius: 8,
			buttonPadding: 2,
		},
		paramsRight: {
			layout: 3,
			startX: 8,
			startY: 28,
			buttonRadius: 8,
			buttonPadding: 2,
		},
	},
	displaySaverTimeout: 0,
};

let buttonLayoutDefinitions = { buttonLayout: {}, buttonLayoutRight: {} };

const buttonLayoutSchemaBase = yup.number().required();

let buttonLayoutSchema = buttonLayoutSchemaBase.label('Button Layout Left');
let buttonLayoutRightSchema = buttonLayoutSchemaBase.label(
	'Button Layout Right',
);

const schema = yup.object().shape({
	enabled: yup.number().label('Enabled?'),
	i2cAddress: yup.string().required().label('I2C Address'),
	i2cBlock: yup
		.number()
		.required()
		.oneOf(I2C_BLOCKS.map((o) => o.value))
		.label('I2C Block'),
	flipDisplay: yup
		.number()
		.oneOf(DISPLAY_FLIP_MODES.map((o) => o.value))
		.label('Flip Display'),
	invertDisplay: yup.number().label('Invert Display'),
	turnOffWhenSuspended: yup.number().label('Turn Off When Suspended'),
	buttonLayout: buttonLayoutSchema,
	buttonLayoutRight: buttonLayoutRightSchema,
	splashMode: yup
		.number()
		.required()
		.oneOf(SPLASH_MODES.map((o) => o.value))
		.label('Splash Screen'),
	buttonLayoutCustomOptions: yup.object().shape({
		params: yup.object().shape({
			layout: buttonLayoutSchema,
			startX: yup.number().required().min(0).max(128).label('Start X'),
			startY: yup.number().required().min(0).max(64).label('Start Y'),
			buttonRadius: yup
				.number()
				.required()
				.min(0)
				.max(20)
				.label('Button Radius'),
			buttonPadding: yup
				.number()
				.required()
				.min(0)
				.max(20)
				.label('Button Padding'),
		}),
		paramsRight: yup.object().shape({
			layout: buttonLayoutRightSchema,
			startX: yup.number().required().min(0).max(128).label('Start X'),
			startY: yup.number().required().min(0).max(64).label('Start Y'),
			buttonRadius: yup
				.number()
				.required()
				.min(0)
				.max(20)
				.label('Button Radius'),
			buttonPadding: yup
				.number()
				.required()
				.min(0)
				.max(20)
				.label('Button Padding'),
		}),
	}),
	splashDuration: yup.number().required().min(0).label('Splash Duration'),
	displaySaverTimeout: yup.number().required().min(0).label('Display Saver'),
});

const FormContext = () => {
	const { values, setValues } = useFormikContext();

	useEffect(() => {
		async function fetchData() {
			const data = await WebApi.getDisplayOptions();
			const splashImageResponse = await WebApi.getSplashImage();
			data.splashImage = splashImageResponse.splashImage;
			buttonLayoutDefinitions = await WebApi.getButtonLayoutDefs();
			buttonLayoutSchema = buttonLayoutSchema.oneOf(
				Object.values(buttonLayoutDefinitions.buttonLayout),
			);
			buttonLayoutRightSchema = buttonLayoutRightSchema.oneOf(
				Object.values(buttonLayoutDefinitions.buttonLayoutRight),
			);
			setValues(data);
		}
		fetchData();
	}, [setValues]);

	useEffect(() => {
		async function setDisplayOptions() {
			if (!!values.enabled) values.enabled = parseInt(values.enabled);
			if (!!values.i2cBlock) values.i2cBlock = parseInt(values.i2cBlock);
			if (!!values.flipDisplay)
				values.flipDisplay = parseInt(values.flipDisplay);
			if (!!values.invertDisplay)
				values.invertDisplay = parseInt(values.invertDisplay);
			if (!!values.buttonLayout)
				values.buttonLayout = parseInt(values.buttonLayout);
			if (!!values.buttonLayoutRight)
				values.buttonLayoutRight = parseInt(values.buttonLayoutRight);
			if (!!values.splashMode) values.splashMode = parseInt(values.splashMode);
			if (!!values.splashChoice)
				values.splashChoice = parseInt(values.splashChoice);
			if (!!values.splashDuration)
				values.splashDuration = parseInt(values.splashDuration);
			if (!!values.turnOffWhenSuspended)
				values.turnOffWhenSuspended = parseInt(values.turnOffWhenSuspended);

			await WebApi.setDisplayOptions(values, true);
		}

		setDisplayOptions();
	}, [values, setValues]);

	useEffect(() => {
		async function setSplashImage() {
			if (!!values.enabled) values.enabled = parseInt(values.enabled);
			if (!!values.i2cBlock) values.i2cBlock = parseInt(values.i2cBlock);
			if (!!values.flipDisplay)
				values.flipDisplay = parseInt(values.flipDisplay);
			if (!!values.invertDisplay)
				values.invertDisplay = parseInt(values.invertDisplay);
			if (!!values.turnOffWhenSuspended)
				values.turnOffWhenSuspended = parseInt(values.turnOffWhenSuspended);
			if (!!values.buttonLayout)
				values.buttonLayout = parseInt(values.buttonLayout);
			if (!!values.buttonLayoutRight)
				values.buttonLayoutRight = parseInt(values.buttonLayoutRight);
			if (!!values.splashMode) values.splashMode = parseInt(values.splashMode);
			if (!!values.splashChoice)
				values.splashChoice = parseInt(values.splashChoice);

			await WebApi.setDisplayOptions(values, true);
		}

		setSplashImage();
	}, [values.splashImage]);

	return null;
};

const isButtonLayoutCustom = (values) =>
	values.buttonLayout === 12 || values.buttonLayoutRight === 16;

export default function DisplayConfigPage() {
	const {
		updateUsedPins,
		getAvailablePeripherals,
		getSelectedPeripheral,
		updatePeripherals,
		updateAddons,
	} = useContext(AppContext);
	const [saveMessage, setSaveMessage] = useState('');

	const { t } = useTranslation('');

	useEffect(() => {
		updateAddons();
		updatePeripherals();
	}, []);

	const onSuccess = async (values) => {
		const success = await WebApi.setDisplayOptions(values, false).then(() =>
			WebApi.setSplashImage(values),
		);

		if (success) await updateUsedPins();

		setSaveMessage(
			success
				? t('Common:saved-success-message')
				: t('Common:saved-error-message'),
		);
	};

	const onChangeCanvas = (base64, form, field) => {
		return form.setFieldValue(field.name, base64);
	};

	return (
		<Formik
			validationSchema={schema}
			onSubmit={onSuccess}
			initialValues={defaultValues}
		>
			{({ handleSubmit, handleChange, values, errors, setFieldValue }) => {
				const handlePeripheralChange = (e) => {
					let device = getSelectedPeripheral('i2c', e.target.value);
					handleChange(e);
				};

				return (
					console.log('errors', errors) ||
					console.log('values', values) || (
						<>
							<Section title={t('DisplayConfig:header-text')}>
							{getAvailablePeripherals('i2c') ? (
								<div>
									<p>{t('DisplayConfig:sub-header-text')}</p>
									<ul>
										<Trans ns="DisplayConfig" i18nKey="list-text">
											<li>Monochrome display with 128x64 resolution</li>
											<li>
												Uses I2C with a SSD1306, SH1106, SH1107 or other
												compatible display IC
											</li>
											<li>Supports 3.3v operation</li>
										</Trans>
									</ul>
									<Form noValidate onSubmit={handleSubmit}>
										<h1>{t('DisplayConfig:section.hardware-header')}</h1>
										<Row className="mb-4">
											<FormSelect
												label={t('Common:switch-enabled')}
												name="enabled"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.enabled}
												error={errors.enabled}
												isInvalid={errors.enabled}
												onChange={handleChange}
											>
												{ON_OFF_OPTIONS.map((o, i) => (
													<option key={`enabled-option-${i}`} value={o.value}>
														{o.label}
													</option>
												))}
											</FormSelect>
											<FormSelect
												label={t('DisplayConfig:form.i2c-block-label')}
												name="i2cBlock"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.i2cBlock}
												error={errors.i2cBlock}
												isInvalid={errors.i2cBlock}
												onChange={handlePeripheralChange}
											>
												{getAvailablePeripherals('i2c').map((o, i) => (
													<option key={`i2cBlock-option-${i}`} value={o.value}>
														{o.label}
													</option>
												))}
											</FormSelect>
											<FormControl
												type="text"
												label={t('DisplayConfig:form.i2c-address-label')}
												name="i2cAddress"
												className="form-control-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.i2cAddress}
												error={errors.i2cAddress}
												isInvalid={errors.i2cAddress}
												onChange={handleChange}
												maxLength={4}
											/>
										</Row>
										<h1>{t('DisplayConfig:section.screen-header')}</h1>
										<Row className="mb-4">
											<FormSelect
												label={t('DisplayConfig:form.flip-display-label')}
												name="flipDisplay"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.flipDisplay}
												error={errors.flipDisplay}
												isInvalid={errors.flipDisplay}
												onChange={handleChange}
											>
												{DISPLAY_FLIP_MODES.map((o, i) => (
													<option
														key={`flipDisplay-option-${i}`}
														value={o.value}
													>
														{o.label}
													</option>
												))}
											</FormSelect>
											<FormSelect
												label={t('DisplayConfig:form.invert-display-label')}
												name="invertDisplay"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.invertDisplay}
												error={errors.invertDisplay}
												isInvalid={errors.invertDisplay}
												onChange={handleChange}
											>
												{ON_OFF_OPTIONS.map((o, i) => (
													<option
														key={`invertDisplay-option-${i}`}
														value={o.value}
													>
														{o.label}
													</option>
												))}
											</FormSelect>
											<div className="col-sm-3 mb-3">
												<label className="form-label">
													{t('DisplayConfig:form.power-management-header')}
												</label>
												<Form.Check
													label={t(
														'DisplayConfig:form.turn-off-when-suspended',
													)}
													type="switch"
													name="turnOffWhenSuspended"
													className="align-middle"
													isInvalid={false}
													checked={Boolean(values.turnOffWhenSuspended)}
													onChange={(e) => {
														setFieldValue(
															'turnOffWhenSuspended',
															e.target.checked ? 1 : 0,
														);
													}}
												/>
											</div>
										</Row>
										<h1>{t('DisplayConfig:section.layout-header')}</h1>
										<Row className="mb-4">
											<FormSelect
												label={t('DisplayConfig:form.button-layout-label')}
												name="buttonLayout"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.buttonLayout}
												error={errors.buttonLayout}
												isInvalid={errors.buttonLayout}
												onChange={handleChange}
											>
												{Object.keys(buttonLayoutDefinitions.buttonLayout).map(
													(o, i) => (
														<option
															key={`buttonLayout-option-${i}`}
															value={buttonLayoutDefinitions.buttonLayout[o]}
														>
															{t(`LayoutConfig:layouts.left.${o}`)}
														</option>
													),
												)}
											</FormSelect>
											<FormSelect
												label={t(
													'DisplayConfig:form.button-layout-right-label',
												)}
												name="buttonLayoutRight"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.buttonLayoutRight}
												error={errors.buttonLayoutRight}
												isInvalid={errors.buttonLayoutRight}
												onChange={handleChange}
											>
												{Object.keys(
													buttonLayoutDefinitions.buttonLayoutRight,
												).map((o, i) => (
													<option
														key={`buttonLayoutRight-option-${i}`}
														value={buttonLayoutDefinitions.buttonLayoutRight[o]}
													>
														{t(`LayoutConfig:layouts.right.${o}`)}
													</option>
												))}
											</FormSelect>
											<FormSelect
												label={t('DisplayConfig:form.splash-mode-label')}
												name="splashMode"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.splashMode}
												error={errors.splashMode}
												isInvalid={errors.splashMode}
												onChange={handleChange}
											>
												{SPLASH_MODES.map((o, i) => (
													<option
														key={`splashMode-option-${i}`}
														value={o.value}
													>
														{o.label}
													</option>
												))}
											</FormSelect>
										</Row>
										{isButtonLayoutCustom(values) && (
											<Row className="mb-3">
												<FormLabel>
													{t('DisplayConfig:form.button-layout-custom-header')}
												</FormLabel>
												<Col sm="6">
													<Form.Group as={Row} name="buttonLayoutCustomOptions">
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-left-label',
															)}
														</Form.Label>
														<FormSelect
															name="buttonLayoutCustomOptions.params.layout"
															className="form-select-sm"
															groupClassName="col-sm-10 mb-1"
															value={
																values.buttonLayoutCustomOptions.params.layout
															}
															onChange={handleChange}
														>
															{Object.keys(
																buttonLayoutDefinitions.buttonLayout,
															).map((o, i) => (
																<option
																	key={`buttonLayout-option-${i}`}
																	value={
																		buttonLayoutDefinitions.buttonLayout[o]
																	}
																>
																	{t(`LayoutConfig:layouts.left.${o}`)}
																</option>
															))}
														</FormSelect>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-start-x-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.params.startX"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-start-y-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.params.startY"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-button-radius-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.params.buttonRadius"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-button-padding-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.params.buttonPadding"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
												</Col>
												<Col sm="6">
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-right-label',
															)}
														</Form.Label>
														<FormSelect
															name="buttonLayoutCustomOptions.paramsRight.layout"
															className="form-select-sm"
															groupClassName="col-sm-10 mb-1"
															value={
																values.buttonLayoutCustomOptions.paramsRight
																	.layout
															}
															onChange={handleChange}
														>
															{Object.keys(
																buttonLayoutDefinitions.buttonLayoutRight,
															).map((o, i) => (
																<option
																	key={`buttonLayoutRight-option-${i}`}
																	value={
																		buttonLayoutDefinitions.buttonLayoutRight[o]
																	}
																>
																	{t(`LayoutConfig:layouts.right.${o}`)}
																</option>
															))}
														</FormSelect>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-start-x-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.paramsRight.startX"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-start-y-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.paramsRight.startY"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-button-radius-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.paramsRight.buttonRadius"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
													<Form.Group as={Row}>
														<Form.Label column>
															{t(
																'DisplayConfig:form.button-layout-custom-button-padding-label',
															)}
														</Form.Label>
														<Col sm="10">
															<Field
																column
																className="mb-1"
																name="buttonLayoutCustomOptions.paramsRight.buttonPadding"
																type="number"
																as={Form.Control}
															/>
														</Col>
													</Form.Group>
												</Col>
											</Row>
										)}
										<Row className="mb-3">
											<FormControl
												type="number"
												label={t('DisplayConfig:form.splash-duration-label')}
												name="splashDuration"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.splashDuration}
												error={errors.splashDuration}
												isInvalid={errors.splashDuration}
												onChange={handleChange}
												min={0}
											/>
											<FormControl
												type="number"
												label={t(
													'DisplayConfig:form.display-saver-timeout-label',
												)}
												name="displaySaverTimeout"
												className="form-select-sm"
												groupClassName="col-sm-3 mb-3"
												value={values.displaySaverTimeout}
												error={errors.displaySaverTimeout}
												isInvalid={errors.displaySaverTimeout}
												onChange={handleChange}
												min={0}
											/>
										</Row>
										<Row>
											<Field name="splashImage">
												{({
													field, // { name, value, onChange, onBlur }
													form, // also values, setXXXX, handleXXXX, dirty, isValid, status, etc.
												}) => (
													<div className="mt-3">
														<Canvas
															onChange={(base64) =>
																onChangeCanvas(base64, form, field)
															}
															value={field.value}
														/>
													</div>
												)}
											</Field>
										</Row>
										<div className="mt-3">
											<Button type="submit">
												{t('Common:button-save-label')}
											</Button>
											{saveMessage ? (
												<span className="alert">{saveMessage}</span>
											) : null}
										</div>
										<FormContext />
									</Form>
								</div>
							) : (
								<FormLabel>
									<Trans
										ns="PeripheralMapping"
										i18nKey="peripheral-toggle-unavailable"
										values={{ name: 'I2C' }}
									>
										<NavLink exact="true" to="/peripheral-mapping">
											{t('PeripheralMapping:header-text')}
										</NavLink>
									</Trans>
								</FormLabel>
							)}
						</Section>
						{getAvailablePeripherals('i2c') ? (
							<AnimatedSplashSection />
						) : null}
						</>
					)
				);
			}}
		</Formik>
	);
}

const Canvas = ({ value: bitsArray, onChange }) => {
	const [image, setImage] = useState(null);
	const [canvasContext, setCanvasContext] = useState(null);
	const [inverted, setInverted] = useState(false);
	const canvasRef = useRef();

	const { t } = useTranslation('');

	useEffect(() => {
		setCanvasContext(canvasRef.current.getContext('2d'));
	}, []);

	// image to bitsArray (binary)
	useEffect(() => {
		if (canvasContext == null || image == null) return;

		const ctxWidth = canvasContext.canvas.width,
			ctxHeight = canvasContext.canvas.height;
		const imgWidth = image.width,
			imgHeight = image.height;
		const ratioWidth = imgWidth / ctxWidth,
			ratioHeight = imgHeight / ctxHeight,
			ratioAspect =
				ratioWidth > 1 ? ratioWidth : ratioHeight > 1 ? ratioHeight : 1;
		const newWidth = imgWidth / ratioAspect,
			newHeight = imgHeight / ratioAspect;
		const offsetX = ctxWidth / 2 - newWidth / 2,
			offsetY = ctxHeight / 2 - newHeight / 2;
		canvasContext.clearRect(
			0,
			0,
			canvasRef.current.width,
			canvasRef.current.height,
		);
		canvasContext.drawImage(image, offsetX, offsetY, newWidth, newHeight);

		var imgPixels = canvasContext.getImageData(
			0,
			0,
			canvasContext.canvas.width,
			canvasContext.canvas.height,
		);

		// Convert to monochrome
		for (var i = 0; i < imgPixels.data.length; i = i + 4) {
			var avg =
				(imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / 3;
			if (avg > 123) avg = 255;
			else avg = 0;
			imgPixels.data[i] = avg;
			imgPixels.data[i + 1] = avg;
			imgPixels.data[i + 2] = avg;
		}

		// Pick only first channel because all of them are same
		const bitsArray = chunk(
			[...new Uint8Array(imgPixels.data)].filter((x, y) => y % 4 === 0),
			8,
		).map((chunks) =>
			chunks.reduce((acc, curr, i) => {
				return acc + ((curr === 255 ? 1 : 0) << (7 - i));
			}, 0),
		);

		onChange(bitsArray.map((a) => (inverted ? 255 - a : a)));
	}, [image, canvasContext]);

	// binary to RGBA
	useEffect(() => {
		if (canvasContext == null) return;

		const w = canvasContext.canvas.width;
		const h = canvasContext.canvas.height;
		const rgbToRgba = [];

		// expand bytes to individual binary bits and then bits to 255 or 0, because monochrome
		const bitsArrayArray = bitsArray.flatMap((a) => {
			const bits = a.toString(2).split('').map(Number);
			const full = Array(8 - bits.length)
				.fill(0)
				.concat(bits);
			return full.map((a) => (a === 1 ? 255 : 0));
		});

		// fill up the new array as RGBA
		bitsArrayArray.forEach((x) => {
			rgbToRgba.push(x);
			rgbToRgba.push(x);
			rgbToRgba.push(x);
			rgbToRgba.push(255);
		});
		const imageDataCopy = new ImageData(new Uint8ClampedArray(rgbToRgba), w, h);
		canvasContext.putImageData(imageDataCopy, 0, 0, 0, 0, w, h);
	}, [bitsArray, canvasContext]);

	const onImageAdd = (ev) => {
		var file = ev.target.files[0];
		var fr = new FileReader();
		fr.onload = () => {
			const img = new Image();
			img.onload = () => {
				setImage(img);
			};
			img.src = fr.result;
		};
		fr.readAsDataURL(file);
	};

	const toggleInverted = () => {
		onChange(bitsArray.map((a) => 255 - a));
		setInverted(!inverted);
	};

	return (
		<div style={{ display: 'flex', alignItems: 'center' }}>
			<canvas
				ref={canvasRef}
				width="128"
				height="64"
				style={{ background: 'black' }}
			/>
			<div style={{ marginLeft: '11px' }}>
				<input
					type="file"
					id="image-input"
					accept="image/jpeg, image/png, image/jpg"
					onChange={onImageAdd}
				/>
				<br />
				<input
					type="checkbox"
					checked={inverted}
					onChange={toggleInverted}
				/>{' '}
				{t('DisplayConfig:form.inverted-label')}
				{/* <ErrorMessage name="splashImage" /> */}
			</div>
		</div>
	);
};

const processGifFile = async (file, threshold = 128, invert = false) => {
	const arrayBuffer = await file.arrayBuffer();
	const uint8Arr = new Uint8Array(arrayBuffer);
	const reader = new GifReader(uint8Arr);
	const numFrames = reader.numFrames();
	if (numFrames === 0) {
		throw new Error('No frames found in GIF');
	}

	const srcW = reader.width;
	const srcH = reader.height;
	const targetW = 128;
	const targetH = 64;

	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = srcW;
	tempCanvas.height = srcH;
	const tempCtx = tempCanvas.getContext('2d');

	const outCanvas = document.createElement('canvas');
	outCanvas.width = targetW;
	outCanvas.height = targetH;
	const outCtx = outCanvas.getContext('2d');
	outCtx.imageSmoothingEnabled = false;

	const scale = Math.min(targetW / srcW, targetH / srcH);
	const newW = Math.max(1, Math.round(srcW * scale));
	const newH = Math.max(1, Math.round(srcH * scale));
	const offX = Math.floor((targetW - newW) / 2);
	const offY = Math.floor((targetH - newH) / 2);

	const frames1bpp = [];
	const previewDataUrls = [];
	const delays = [];
	const cumulative = [];
	let totalDuration = 0;

	const rgba = new Uint8ClampedArray(srcW * srcH * 4);

	for (let f = 0; f < numFrames; f++) {
		const info = reader.frameInfo(f);
		let delay = (info.delay || 10) * 10;
		if (delay < 20) delay = 20;
		delays.push(delay);
		totalDuration += delay;
		cumulative.push(totalDuration);

		reader.decodeAndBlitFrameRGBA(f, rgba);

		const imgData = new ImageData(rgba, srcW, srcH);
		tempCtx.putImageData(imgData, 0, 0);

		outCtx.fillStyle = '#000000';
		outCtx.fillRect(0, 0, targetW, targetH);
		outCtx.drawImage(tempCanvas, 0, 0, srcW, srcH, offX, offY, newW, newH);

		const outPixels = outCtx.getImageData(0, 0, targetW, targetH);
		const frameBytes = new Uint8Array(1024);

		for (let y = 0; y < targetH; y++) {
			for (let x = 0; x < targetW; x++) {
				const idx = (y * targetW + x) * 4;
				const r = outPixels.data[idx];
				const g = outPixels.data[idx + 1];
				const b = outPixels.data[idx + 2];
				const a = outPixels.data[idx + 3];
				const lum = a < 128 ? 0 : (r + g + b) / 3;
				let isWhite = lum >= threshold ? 1 : 0;
				if (invert) isWhite = 1 - isWhite;

				if (isWhite) {
					const byteIdx = y * 16 + Math.floor(x / 8);
					const bitIdx = 7 - (x % 8);
					frameBytes[byteIdx] |= 1 << bitIdx;
				}
			}
		}
		frames1bpp.push(frameBytes);
		previewDataUrls.push(outCanvas.toDataURL());
	}

	// Pack header: 20 bytes Little Endian
	const headerBuf = new ArrayBuffer(20);
	const headerView = new DataView(headerBuf);
	headerView.setUint32(0, 0x53504c53, true); // magic: "SPLS"
	headerView.setUint16(4, 1, true); // version: 1
	headerView.setUint16(6, numFrames, true); // frame_count
	headerView.setUint32(8, totalDuration, true); // total_duration
	headerView.setUint16(12, 128, true); // width
	headerView.setUint16(14, 64, true); // height
	headerView.setUint16(16, 1024, true); // frame_size
	headerView.setUint16(18, 0, true); // reserved

	// Pack cumulative times: uint32[numFrames] Little Endian
	const cumBuf = new ArrayBuffer(numFrames * 4);
	const cumView = new DataView(cumBuf);
	for (let i = 0; i < numFrames; i++) {
		cumView.setUint32(i * 4, cumulative[i], true);
	}

	// Combine into single Uint8Array
	const totalSize = 20 + numFrames * 4 + numFrames * 1024;
	const payload = new Uint8Array(totalSize);
	payload.set(new Uint8Array(headerBuf), 0);
	payload.set(new Uint8Array(cumBuf), 20);
	let offset = 20 + numFrames * 4;
	for (let i = 0; i < numFrames; i++) {
		payload.set(frames1bpp[i], offset);
		offset += 1024;
	}

	return {
		numFrames,
		totalDuration,
		delays,
		previewDataUrls,
		payload,
		srcW,
		srcH,
	};
};

const uploadAnimation = async (payload, onProgress) => {
	const CHUNK_SIZE = 2048;
	const totalSize = payload.length;
	const numChunks = Math.ceil(totalSize / CHUNK_SIZE);

	for (let i = 0; i < numChunks; i++) {
		const offset = i * CHUNK_SIZE;
		const chunkSlice = payload.subarray(
			offset,
			Math.min(offset + CHUNK_SIZE, totalSize),
		);

		let binary = '';
		for (let b = 0; b < chunkSlice.length; b++) {
			binary += String.fromCharCode(chunkSlice[b]);
		}
		const base64Data = btoa(binary);

		const res = await WebApi.uploadSplashAnimChunk({
			offset,
			totalSize,
			data: base64Data,
		});

		if (!res || !res.success) {
			throw new Error(res?.error || `Upload failed at chunk ${i + 1}`);
		}

		if (onProgress) {
			onProgress(Math.round(((i + 1) / numChunks) * 100), i + 1, numChunks);
		}
	}
};

const AnimatedSplashSection = () => {
	const { t } = useTranslation('');
	const [statusInfo, setStatusInfo] = useState(null);
	const [loadingInfo, setLoadingInfo] = useState(true);
	const [selectedFile, setSelectedFile] = useState(null);
	const [animData, setAnimData] = useState(null);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(true);
	const [threshold, setThreshold] = useState(128);
	const [inverted, setInverted] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatusText, setUploadStatusText] = useState('');
	const [alertMsg, setAlertMsg] = useState(null);
	const [alertVariant, setAlertVariant] = useState('info');

	const animTimerRef = useRef(null);
	const fileInputRef = useRef(null);

	const fetchStatus = async () => {
		setLoadingInfo(true);
		try {
			const info = await WebApi.getSplashAnimationInfo();
			setStatusInfo(info);
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingInfo(false);
		}
	};

	useEffect(() => {
		fetchStatus();
	}, []);

	useEffect(() => {
		if (!animData || !isPlaying || animData.numFrames <= 1) return;

		const delay = animData.delays[previewIndex] || 100;
		animTimerRef.current = setTimeout(() => {
			setPreviewIndex((prev) => (prev + 1) % animData.numFrames);
		}, delay);

		return () => {
			if (animTimerRef.current) clearTimeout(animTimerRef.current);
		};
	}, [animData, previewIndex, isPlaying]);

	const parseAndProcess = async (file, thresh, inv) => {
		setProcessing(true);
		try {
			const res = await processGifFile(file, thresh, inv);
			setAnimData(res);
			setPreviewIndex(0);
		} catch (err) {
			setAlertVariant('danger');
			setAlertMsg(
				t(
					'DisplayConfig:animated-splash-parse-fail',
					'Failed to parse GIF: {{error}}',
					{ error: err.message },
				),
			);
			setAnimData(null);
		} finally {
			setProcessing(false);
		}
	};

	const onFileChange = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setSelectedFile(file);
		setAlertMsg(null);
		parseAndProcess(file, threshold, inverted);
	};

	const onThresholdChange = (e) => {
		const val = parseInt(e.target.value, 10);
		setThreshold(val);
		if (selectedFile) {
			parseAndProcess(selectedFile, val, inverted);
		}
	};

	const onInvertedChange = (e) => {
		const val = e.target.checked;
		setInverted(val);
		if (selectedFile) {
			parseAndProcess(selectedFile, threshold, val);
		}
	};

	const handleUpload = async () => {
		if (!animData || !animData.payload) return;
		setUploading(true);
		setUploadProgress(0);
		setUploadStatusText(
			t(
				'DisplayConfig:animated-splash-starting',
				'Starting flash erase & upload...',
			),
		);
		setAlertMsg(null);

		try {
			await uploadAnimation(animData.payload, (percent, curr, total) => {
				setUploadProgress(percent);
				setUploadStatusText(
					t(
						'DisplayConfig:animated-splash-writing-chunk',
						'Writing chunk {{curr}} / {{total}} ({{percent}}%)...',
						{ curr, total, percent },
					),
				);
			});
			setAlertVariant('success');
			setAlertMsg(
				t(
					'DisplayConfig:animated-splash-success',
					'Animated splash screen successfully flashed to RP2040 Flash memory! It will play automatically when the controller starts up.',
				),
			);
			await fetchStatus();
		} catch (err) {
			setAlertVariant('danger');
			setAlertMsg(
				t(
					'DisplayConfig:animated-splash-upload-fail',
					'Upload failed: {{error}}',
					{ error: err.message },
				),
			);
		} finally {
			setUploading(false);
			setUploadStatusText('');
		}
	};

	const handleClear = async () => {
		if (
			!window.confirm(
				t(
					'DisplayConfig:animated-splash-confirm-clear',
					'Are you sure you want to remove the custom animated splash screen and restore the default splash?',
				),
			)
		) {
			return;
		}
		setUploading(true);
		setAlertMsg(null);
		try {
			await WebApi.clearSplashAnimation();
			setAlertVariant('success');
			setAlertMsg(
				t(
					'DisplayConfig:animated-splash-cleared',
					'Flash animation cleared. Default static splash screen restored.',
				),
			);
			await fetchStatus();
		} catch (err) {
			setAlertVariant('danger');
			setAlertMsg(
				t(
					'DisplayConfig:animated-splash-clear-fail',
					'Clear failed: {{error}}',
					{ error: err.message },
				),
			);
		} finally {
			setUploading(false);
		}
	};

	return (
		<Section
			title={t(
				'DisplayConfig:animated-splash-header',
				'Animated Splash Screen (GIF Direct Upload)',
			)}
		>
			<p className="text-muted">
				{t(
					'DisplayConfig:animated-splash-desc',
					'Upload an animated GIF directly into the RP2040 Flash memory without reflashing firmware. Frames will automatically be converted to 128x64 monochrome format.',
				)}
			</p>

			<div className="mb-4 p-3 bg-secondary bg-opacity-10 rounded border">
				<div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
					<div>
						<strong>
							{t(
								'DisplayConfig:animated-splash-status',
								'Current Flash Status: ',
							)}
						</strong>
						{loadingInfo ? (
							<span>
								{t('DisplayConfig:animated-splash-checking', 'Checking...')}
							</span>
						) : statusInfo?.hasAnimation ? (
							<Badge bg="success" className="ms-2">
								{t(
									'DisplayConfig:animated-splash-active',
									'Active ({{count}} frames, {{duration}}s, {{size}} KB)',
									{
										count: statusInfo.frameCount,
										duration: (statusInfo.totalDuration / 1000).toFixed(2),
										size: Math.round(
											(20 +
												statusInfo.frameCount * 4 +
												statusInfo.frameCount * 1024) /
												1024,
										),
									},
								)}
							</Badge>
						) : (
							<Badge bg="secondary" className="ms-2">
								{t(
									'DisplayConfig:animated-splash-default-active',
									'Default Static Splash Active',
								)}
							</Badge>
						)}
					</div>
					{statusInfo?.hasAnimation && (
						<Button
							variant="outline-danger"
							size="sm"
							onClick={handleClear}
							disabled={uploading}
						>
							{t(
								'DisplayConfig:animated-splash-clear-btn',
								'Clear Animation from Flash',
							)}
						</Button>
					)}
				</div>
			</div>

			{alertMsg && (
				<Alert
					variant={alertVariant}
					onClose={() => setAlertMsg(null)}
					dismissible
				>
					{alertMsg}
				</Alert>
			)}

			<Row className="mb-3">
				<Col sm="6">
					<Form.Group>
						<Form.Label>
							{t(
								'DisplayConfig:animated-splash-select-gif',
								'Select Animated GIF:',
							)}
						</Form.Label>
						<Form.Control
							ref={fileInputRef}
							type="file"
							accept="image/gif"
							onChange={onFileChange}
							disabled={uploading}
						/>
					</Form.Group>
				</Col>
			</Row>

			{processing && (
				<div className="my-3 text-info">
					{t(
						'DisplayConfig:animated-splash-converting',
						'Converting GIF frames to 128x64 monochrome...',
					)}
				</div>
			)}

			{animData && !processing && (
				<div className="mt-3 p-3 bg-dark bg-opacity-25 rounded border">
					<h5>
						{t(
							'DisplayConfig:animated-splash-preview-title',
							'Preview & Flash Programming',
						)}
					</h5>
					<Row className="align-items-center mb-3">
						<Col sm="auto">
							<div
								style={{
									width: 256,
									height: 128,
									backgroundColor: '#000',
									border: '2px solid #666',
									borderRadius: 4,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									overflow: 'hidden',
								}}
							>
								{animData.previewDataUrls[previewIndex] ? (
									<img
										src={animData.previewDataUrls[previewIndex]}
										alt="Preview"
										style={{
											width: 256,
											height: 128,
											imageRendering: 'pixelated',
										}}
									/>
								) : null}
							</div>
						</Col>
						<Col sm="6">
							<div>
								<strong>
									{t(
										'DisplayConfig:animated-splash-source-size',
										'Source Size: ',
									)}
								</strong>
								{animData.srcW} x {animData.srcH}
							</div>
							<div>
								<strong>
									{t(
										'DisplayConfig:animated-splash-target-display',
										'Target Display: ',
									)}
								</strong>
								128 x 64 (OLED)
							</div>
							<div>
								<strong>
									{t(
										'DisplayConfig:animated-splash-total-frames',
										'Total Frames: ',
									)}
								</strong>
								{animData.numFrames}
							</div>
							<div>
								<strong>
									{t(
										'DisplayConfig:animated-splash-total-duration',
										'Total Duration: ',
									)}
								</strong>
								{(animData.totalDuration / 1000).toFixed(2)} s
							</div>
							<div>
								<strong>
									{t('DisplayConfig:animated-splash-flash-size', 'Flash Size: ')}
								</strong>
								{(animData.payload.length / 1024).toFixed(1)} KB / 512 KB max
							</div>
							<div className="mt-2">
								<Button
									size="sm"
									variant="secondary"
									onClick={() => setIsPlaying((p) => !p)}
									className="me-2"
								>
									{isPlaying
										? t('DisplayConfig:animated-splash-pause', 'Pause Preview')
										: t('DisplayConfig:animated-splash-play', 'Play Preview')}
								</Button>
								<span className="text-muted">
									{t('DisplayConfig:animated-splash-frame', 'Frame: ')}
									{previewIndex + 1} / {animData.numFrames}
								</span>
							</div>
						</Col>
					</Row>

					<Row className="mb-3">
						<Col sm="4">
							<Form.Group>
								<Form.Label>
									{t(
										'DisplayConfig:animated-splash-threshold',
										'Brightness Threshold: {{thresh}}',
										{ thresh: threshold },
									)}
								</Form.Label>
								<Form.Range
									min={0}
									max={255}
									value={threshold}
									onChange={onThresholdChange}
									disabled={uploading}
								/>
							</Form.Group>
						</Col>
						<Col sm="4" className="d-flex align-items-center">
							<Form.Check
								type="checkbox"
								id="invertCheck"
								label={t(
									'DisplayConfig:animated-splash-invert',
									'Invert Black/White',
								)}
								checked={inverted}
								onChange={onInvertedChange}
								disabled={uploading}
							/>
						</Col>
					</Row>

					{uploading && (
						<div className="mb-3">
							<div className="mb-1 text-primary">{uploadStatusText}</div>
							<ProgressBar
								now={uploadProgress}
								label={`${uploadProgress}%`}
								animated
							/>
						</div>
					)}

					<div>
						<Button
							variant="primary"
							onClick={handleUpload}
							disabled={uploading || animData.payload.length > 512 * 1024}
						>
							{uploading
								? t('DisplayConfig:animated-splash-writing', 'Writing to Flash...')
								: t(
										'DisplayConfig:animated-splash-write-btn',
										'Write Animation to Flash',
								  )}
						</Button>
					</div>
				</div>
			)}
		</Section>
	);
};
